const PLATFORM_PATTERNS = {
  vercel: {
    domains: ['vercel.app', 'now.sh', 'vercel.com'],
    headers: ['x-vercel-id', 'x-vercel-cache', 'x-now-id'],
    serverHeaders: ['vercel'],
    reason: 'Vercel CEO Guillermo Rauch publicly met with Israeli Prime Minister Netanyahu and praised Israel\'s actions in Gaza. By hosting on Vercel, your content helps legitimize and fund this support.'
  }
};

let blockedDomains = [];
let stats = { totalBlocked: 0, bypassed: 0, last30Days: [] };
const recentlyBlocked = new Set();
const BLOCK_COOLDOWN = 5000;
let temporarilyBypassed = null;

function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    for (const [platform, config] of Object.entries(PLATFORM_PATTERNS)) {
      for (const domain of config.domains) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          return platform;
        }
      }
    }
  } catch (e) {
    console.error('Platform detection error:', e);
  }
  return null;
}

function blockDomain(domain, platform) {
  if (blockedDomains.some(d => d.domain === domain)) {
    return false;
  }
  
  blockedDomains.push({ domain, platform, timestamp: Date.now() });
  chrome.storage.local.set({ blockedDomains });
  
  return true;
}

function unblockDomain(domain) {
  blockedDomains = blockedDomains.filter(d => d.domain !== domain);
  chrome.storage.local.set({ blockedDomains: blockedDomains });
  
  return true;
}

function checkAndBlockCurrentTab(tabId, url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('file://')) {
    return;
  }

  const hostname = new URL(url).hostname;
  
  if (recentlyBlocked.has(hostname)) {
    return;
  }

  if (temporarilyBypassed === hostname) {
    temporarilyBypassed = null;
    return;
  }

  const platform = detectPlatform(url);
  
  if (platform) {
    chrome.storage.local.get('disabledPlatforms', (result) => {
      const disabledPlatforms = result.disabledPlatforms || [];
      
      if (disabledPlatforms.includes(platform)) {
        return;
      }

      recentlyBlocked.add(hostname);
      setTimeout(() => recentlyBlocked.delete(hostname), BLOCK_COOLDOWN);
      
      blockDomain(hostname, platform);

      stats.totalBlocked++;
      stats.last30Days.push({ date: Date.now(), domain: hostname, platform });
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      stats.last30Days = stats.last30Days.filter(s => s.date > thirtyDaysAgo);
      chrome.storage.local.set({ stats });

      const extUrl = chrome.runtime.getURL('blocked.html');
      const config = PLATFORM_PATTERNS[platform];
      const reason = config?.reason || 'This platform is blocked.';
      const blockUrl = extUrl + '?domain=' + encodeURIComponent(hostname) + '&platform=' + encodeURIComponent(platform) + '&reason=' + encodeURIComponent(reason) + '&url=' + encodeURIComponent(url);
      chrome.tabs.update(tabId, { url: blockUrl });
    });
  }
}

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId !== 0) return;
  
  chrome.storage.local.get('autoBlock', (result) => {
    if (result.autoBlock === false) return;
    checkAndBlockCurrentTab(details.tabId, details.url);
  });
});

console.log('Background loaded');
loadSavedBlocklist();

function loadSavedBlocklist() {
  chrome.storage.local.get(['blockedDomains', 'stats'], (result) => {
    blockedDomains = result.blockedDomains || [];
    stats = result.stats || { totalBlocked: 0, bypassed: 0, last30Days: [] };
  });
}

loadSavedBlocklist();

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-blocking') {
    chrome.storage.local.get('autoBlock', (result) => {
      chrome.storage.local.set({ autoBlock: !result.autoBlock });
    });
  }
  
  if (command === 'bypass-current') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        try {
          const hostname = new URL(tabs[0].url).hostname;
          temporarilyBypassed = hostname;
          chrome.tabs.reload(tabs[0].id);
        } catch (e) {}
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBlockedDomains') {
    chrome.storage.local.get('blockedDomains', (result) => {
      sendResponse({ domains: result.blockedDomains || [] });
    });
    return true;
  }
  
  if (request.action === 'unblockDomain') {
    unblockDomain(request.domain).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'toggleAutoBlock') {
    chrome.storage.local.set({ autoBlock: request.enabled }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'togglePlatform') {
    chrome.storage.local.get('disabledPlatforms', (result) => {
      let disabled = result.disabledPlatforms || [];
      if (request.enabled) {
        disabled = disabled.filter(p => p !== request.platform);
      } else {
        if (!disabled.includes(request.platform)) {
          disabled.push(request.platform);
        }
      }
      chrome.storage.local.set({ disabledPlatforms: disabled }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (request.action === 'getSettings') {
    chrome.storage.local.get(['autoBlock', 'disabledPlatforms'], (result) => {
      sendResponse({
        autoBlock: result.autoBlock !== false,
        disabledPlatforms: result.disabledPlatforms || []
      });
    });
    return true;
  }

  if (request.action === 'temporarilyBypass') {
    temporarilyBypassed = request.domain;
    stats.bypassed++;
    chrome.storage.local.set({ stats });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'getStats') {
    chrome.storage.local.get('stats', (result) => {
      sendResponse(result.stats || stats);
    });
    return true;
  }

  if (request.action === 'exportDomains') {
    chrome.storage.local.get('blockedDomains', (result) => {
      const data = result.blockedDomains || [];
      sendResponse({ 
        domains: data.map(d => d.domain).join('\n'),
        json: JSON.stringify(data, null, 2)
      });
    });
    return true;
  }
});