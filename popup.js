document.addEventListener('DOMContentLoaded', async () => {
  const autoBlockToggle = document.getElementById('autoBlockToggle');
  const platformToggles = document.querySelectorAll('.platform-toggle');
  const domainList = document.getElementById('domainList');
  const countSpan = document.getElementById('count');

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

  async function init() {
    const settings = await loadSettings();
    autoBlockToggle.checked = settings.autoBlock;

    const platforms = ['vercel', 'netlify', 'heroku', 'render'];
    platformToggles.forEach((toggle) => {
      const platform = toggle.dataset.platform;
      toggle.checked = !settings.disabledPlatforms.includes(platform);
    });

    renderDomainList(await loadBlockedDomains());
  }

  function renderDomainList(domains) {
    countSpan.textContent = `(${domains.length})`;
    
    if (domains.length === 0) {
      domainList.innerHTML = '<div class="empty-state">No domains blocked yet</div>';
      return;
    }

    domainList.innerHTML = domains
      .map(
        (item) => `
        <div class="domain-item">
          <span>${escapeHtml(item.domain)}<span class="platform-badge ${item.platform}">${item.platform}</span></span>
          <button class="unblock-btn" data-domain="${escapeHtml(item.domain)}">Unblock</button>
        </div>
      `
      )
      .join('');

    domainList.querySelectorAll('.unblock-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const domain = e.target.dataset.domain;
        await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: 'unblockDomain', domain }, () => resolve());
        });
        renderDomainList(await loadBlockedDomains());
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  autoBlockToggle.addEventListener('change', async (e) => {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'toggleAutoBlock', enabled: e.target.checked }, () => resolve());
    });
  });

  platformToggles.forEach((toggle) => {
    toggle.addEventListener('change', async (e) => {
      const platform = e.target.dataset.platform;
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'togglePlatform', platform, enabled: e.target.checked }, () => resolve());
      });
    });
  });

  init();
});
