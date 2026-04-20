# Blocktheid

```
▄▄▄  ▄▄                                            
   ██▀▀█▄ ██                    █▄ █▄                █▄
   ██ ▄█▀ ██             ▄▄    ▄██▄██          ▀▀    ██
   ██▀▀█▄ ██ ▄███▄ ▄███▀ ██ ▄█▀ ██ ████▄ ▄█▀█▄ ██ ▄████
 ▄ ██  ▄█ ██ ██ ██ ██    ████   ██ ██ ██ ██▄█▀ ██ ██ ██
 ▀██████▀▄██▄▀███▀▄▀███▄▄██ ▀█▄▄██▄██ ██▄▀█▄▄▄▄██▄█▀███ 
```

Block Vercel-hosted websites to boycott Israel's war on Gaza.

## How to Install

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `blockade` folder
5. The extension icon will appear in your toolbar

## How to Add New Domains

Edit `background.js` and add the domain to `PLATFORM_PATTERNS`:

```javascript
const PLATFORM_PATTERNS = {
  vercel: {
    domains: ['vercel.app', 'now.sh', 'vercel.com'],  // add new domains here
    headers: ['x-vercel-id', 'x-vercel-cache', 'x-now-id'],
    serverHeaders: ['vercel']
  }
};
```

Add a reason for each platform:

```javascript
const PLATFORM_PATTERNS = {
  vercel: {
    domains: ['vercel.app', 'now.sh', 'vercel.com'],
    headers: ['x-vercel-id'],
    serverHeaders: ['vercel'],
    reason: 'Vercel CEO Guillermo Rauch publicly met with Israeli Prime Minister Netanyahu and praised Israel\'s actions in Gaza.'
  }
};
```

Then update the popup HTML to show the new platform.

## How It Works

1. When you visit a website, it checks if the domain matches known Vercel domains
2. If matched, redirects to a block page
3. You can choose to "Bypass once" (allows the site one time) or "Stay blocked"

## Features

- Auto-block Vercel sites
- Block page explains why the site is blocked
- One-time bypass option
- Popup shows list of blocked domains
- Toggle blocking on/off
