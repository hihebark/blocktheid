document.addEventListener('DOMContentLoaded', async () => {
  const autoBlockToggle = document.getElementById('autoBlockToggle');
  const platformToggles = document.querySelectorAll('.platform-toggle');
  const domainList = document.getElementById('domainList');
  const countSpan = document.getElementById('count');
  const exportBtn = document.getElementById('exportBtn');
  const statBlocked = document.getElementById('statBlocked');
  const statBypassed = document.getElementById('statBypassed');

  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        resolve(response || { autoBlock: true, disabledPlatforms: [] });
      });
    });
  }

  async function loadBlockedDomains() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getBlockedDomains' }, (response) => {
        resolve(response?.domains || []);
      });
    });
  }

  async function loadStats() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
        resolve(response || { totalBlocked: 0, bypassed: 0 });
      });
    });
  }

  async function init() {
    const settings = await loadSettings();
    autoBlockToggle.checked = settings.autoBlock;

    const stats = await loadStats();
    statBlocked.textContent = stats.totalBlocked || 0;
    statBypassed.textContent = stats.bypassed || 0;

    const domains = await loadBlockedDomains();
    countSpan.textContent = `(${domains.length})`;
    
    if (domains.length === 0) {
      domainList.innerHTML = '<div class="empty-state">No domains blocked</div>';
    } else {
      domainList.innerHTML = domains.slice(0, 20).map(item => `
        <div class="domain-item">
          <span>${escapeHtml(item.domain)}<span class="platform-badge ${item.platform}">${item.platform}</span></span>
          <button class="unblock-btn" data-domain="${escapeHtml(item.domain)}">×</button>
        </div>
      `).join('');
      
      domainList.querySelectorAll('.unblock-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const domain = e.target.dataset.domain;
          await new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'unblockDomain', domain }, () => resolve());
          });
          init();
        });
      });
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  autoBlockToggle.addEventListener('change', async (e) => {
    await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'toggleAutoBlock', enabled: e.target.checked }, () => resolve());
    });
  });

  platformToggles.forEach(toggle => {
    toggle.addEventListener('change', async (e) => {
      await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'togglePlatform', platform: e.target.dataset.platform, enabled: e.target.checked }, () => resolve());
      });
    });
  });

  exportBtn.addEventListener('click', async () => {
    const data = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'exportDomains' }, resolve);
    });
    
    const blob = new Blob([data.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blocktheid-domains.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  init();
});