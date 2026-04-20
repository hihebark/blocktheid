# Blocktheid

```
        ▼  Blocktheid  ▼
        
▄▄▄  ▄▄                                           
   ██▀▀█▄ ██                    █▄ █▄                █▄
   ██ ▄█▀ ██             ▄▄    ▄██▄██          ▀▀    ██
   ██▀▀█▄ ██ ▄███▄ ▄███▀ ██ ▄█▀ ██ ████▄ ▄█▀█▄ ██ ▄████
 ▄ ██  ▄█ ██ ██ ██ ██    ████   ██ ██ ██ ██▄█▀ ██ ██ ██
 ▀██████▀▄██▄▀███▀▄▀███▄▄██ ▀█▄▄██▄██ ██▄▀█▄▄▄▄██▄█▀███ 
```

Block Vercel-hosted websites to boycott Israel's war on Gaza.

## Install (Chrome)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `blockade` folder

## Install (Firefox)

1. Open Firefox → `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select any file in `firefox/` folder

## Add Domains

Edit `background.js`:

```javascript
const PLATFORM_PATTERNS = {
  vercel: {
    domains: ['vercel.app', 'now.sh', 'vercel.com'],
    reason: 'Vercel CEO met with Netanyahu...'
  }
};
```

## Features

- Auto-block Vercel sites
- Block page with reason
- Bypass once
- Statistics
- Export domains
- Keyboard shortcut: `Alt+B` to toggle, `Alt+X` to bypass