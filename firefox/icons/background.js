const PLATFORM_PATTERNS = {
  vercel: {
    domains: ['vercel.app', 'now.sh', 'vercel.com'],
    headers: ['x-vercel-id', 'x-vercel-cache', 'x-now-id'],
    serverHeaders: ['vercel'],
    reason: 'Vercel CEO Guillermo Rauch publicly met with Israeli Prime Minister Netanyahu and praised Israel\'s actions in Gaza. By hosting on Vercel, your content helps legitimize and fund this support.'
  }
};

let blockedDomains = [];
const recentlyBlocked = new Set();
const BLOCK_COOLDOWN = 5000;
let temporarilyBypassed = null;

async function detectPlatform(url) {
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

async function blockDomain(domain, platform) {
  if (blockedDomains.some(d => d.domain === domain)) {
    return false;
  }
  
  blockedDomains.push({ domain, platform, timestamp: Date.now() });
  await chrome.storage.local.set({ blockedDomains });
  
  return true;
}

async function unblockDomain(domain) {
  blockedDomains = blockedDomains.filter(d => d.domain !== domain);
  await chrome.storage.local.set({ blockedDomains: blockedDomains });
  
  return true;
}

async function checkAndBlockCurrentTab(tabId, url) {
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

  const platform = await detectPlatform(url);
  
  if (platform) {
    const { disabledPlatforms = [] } = await chrome.storage.local.get('disabledPlatforms');
    
    if (disabledPlatforms.includes(platform)) {
      return;
    }

    recentlyBlocked.add(hostname);
    setTimeout(() => recentlyBlocked.delete(hostname), BLOCK_COOLDOWN);
    
    await blockDomain(hostname, platform);

    const extUrl = chrome.runtime.getURL('blocked.html');
    const config = PLATFORM_PATTERNS[platform];
    const reason = config?.reason || 'This platform is blocked.';
    const blockUrl = `${extUrl}?domain=${encodeURIComponent(hostname)}&platform=${encodeURIComponent(platform)}&reason=${encodeURIComponent(reason)}&url=${encodeURIComponent(url)}`;
    console.log('Redirecting to:', blockUrl);
    chrome.tabs.update(tabId, { url: blockUrl });
  }
}

chrome.webNavigation?.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  
  const { autoBlock = true } = await chrome.storage.local.get('autoBlock');
  if (!autoBlock) return;
  
  await checkAndBlockCurrentTab(details.tabId, details.url);
});

async function loadSavedBlocklist() {
  try {
    const result = await chrome.storage.local.get('blockedDomains');
    blockedDomains = result.blockedDomains || [];
  } catch (e) {
    console.error('Failed to load blocklist:', e);
  }
}

loadSavedBlocklist();

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
    sendResponse({ success: true });
    return true;
  }
});