document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const domain = params.get('domain') || '';
  const platform = params.get('platform') || '';
  const reasonParam = params.get('reason');
  const originalUrl = decodeURIComponent(params.get('url') || '');

  const defaultReasons = {
    vercel: 'Vercel CEO Guillermo Rauch publicly met with Israeli Prime Minister Netanyahu and praised Israel\'s actions in Gaza. By hosting on Vercel, your content helps legitimize and fund this support.',
    netlify: 'Netlify has ties to Israeli tech and defense. Hosting on Netlify supports this connection.',
    heroku: 'Heroku is owned by Salesforce, which has business ties in Israel.',
    render: 'Render hosts on infrastructure with ties to Israel.'
  };

  const reason = reasonParam || defaultReasons[platform] || 'This platform is blocked.';

  document.getElementById('domain').textContent = domain;
  document.getElementById('platform').textContent = platform;
  document.getElementById('reason-text').textContent = reason;

  document.getElementById('bypassBtn').addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'temporarilyBypass', domain: domain });
    } catch (e) {}
    window.location.href = originalUrl || ('https://' + domain);
  });

  document.getElementById('stayBtn').addEventListener('click', () => {
    document.querySelector('.buttons').style.display = 'none';
  });
});