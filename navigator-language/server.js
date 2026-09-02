const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const PORT = parseInt(process.env.PORT || '3000', 10);
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

// 獲取區域網路 IPv4 清單
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, address: iface.address });
      }
    }
  }
  return addresses;
}

// 獲取主要 LAN IP
function getPrimaryLocalIp() {
  const list = getLocalIpAddresses();
  // 優先選擇 en0, wlan0, 或第一個找到的 IP
  const preferred = list.find(item => item.name === 'en0' || item.name === 'wlan0');
  if (preferred) return preferred.address;
  if (list.length > 0) return list[0].address;
  return '127.0.0.1';
}

const primaryIp = getPrimaryLocalIp();

// 動態寫入 IP 至 Android 與 iOS 原生專案設定檔
function writeIpToNativeConfigs(ip) {
  try {
    // 1. Android: env.properties (在 Android/app/build.gradle.kts 讀取)
    const androidEnvDir = path.join(__dirname, 'Android');
    if (!fs.existsSync(androidEnvDir)) {
      fs.mkdirSync(androidEnvDir, { recursive: true });
    }
    const envPath = path.join(androidEnvDir, 'env.properties');
    fs.writeFileSync(envPath, `SERVER_IP=${ip}\nSERVER_PORT=${PORT}\n`, 'utf8');
    console.log(`[Auto-Inject] ✅ Android: Successfully wrote local IP (${ip}:${PORT}) to Android/env.properties`);

    // 2. iOS: ServerConfig.swift
    const iosConfigDir = path.join(__dirname, 'IOS/NavigatorLanguageDemo');
    if (!fs.existsSync(iosConfigDir)) {
      fs.mkdirSync(iosConfigDir, { recursive: true });
    }
    const iosConfigPath = path.join(iosConfigDir, 'ServerConfig.swift');
    const iosConfigData = `// 自動生成的 IP 設定檔 (由 server.js 產生)
import Foundation

let SERVER_IP = "${ip}"
let SERVER_PORT = ${PORT}
let SERVER_BASE_URL = "http://${ip}:${PORT}"
`;
    fs.writeFileSync(iosConfigPath, iosConfigData, 'utf8');
    console.log(`[Auto-Inject] ✅ iOS: Successfully wrote local IP (${ip}:${PORT}) to IOS/NavigatorLanguageDemo/ServerConfig.swift`);

    // 嘗試設定 git assume-unchanged 避免覆寫變更污染版控
    exec(`git update-index --assume-unchanged IOS/NavigatorLanguageDemo/ServerConfig.swift`, () => {});
  } catch (err) {
    console.warn(`[Auto-Inject] ⚠️ Warning writing config: ${err.message}`);
  }
}

writeIpToNativeConfigs(primaryIp);

// 解析 HTTP Accept-Language 標頭 (RFC 9110 / RFC 4647)
function parseAcceptLanguage(header) {
  if (!header) return [];
  return header
    .split(',')
    .map(item => {
      const parts = item.trim().split(';');
      const tag = parts[0].trim();
      let q = 1.0;
      for (let i = 1; i < parts.length; i++) {
        const sub = parts[i].trim();
        if (sub.startsWith('q=')) {
          const parsedQ = parseFloat(sub.substring(2));
          if (!isNaN(parsedQ)) q = Math.max(0, Math.min(1, parsedQ));
        }
      }
      return { tag, q };
    })
    .filter(item => item.tag.length > 0)
    .sort((a, b) => b.q - a.q);
}

// 模擬語系協商演算法
function negotiateLanguage(clientTags, supportedLanguages, defaultLang = 'en') {
  const steps = [];

  // 1. Exact Match (完全相符，例如 zh-TW === zh-TW)
  for (const clientItem of clientTags) {
    const clientTag = typeof clientItem === 'string' ? clientItem : clientItem.tag;
    const clientLower = clientTag.toLowerCase();
    
    const exactMatch = supportedLanguages.find(s => s.toLowerCase() === clientLower);
    if (exactMatch) {
      steps.push({
        stage: 'Exact Match',
        clientTag,
        matched: exactMatch,
        description: `找到精確相符語系「${exactMatch}」`
      });
      return { matched: exactMatch, algorithm: 'Exact Match', steps };
    }
  }

  // 2. Prefix / Base Language Match (語系前綴匹配，例如 zh-TW 匹配 zh，或 zh 匹配 zh-TW)
  for (const clientItem of clientTags) {
    const clientTag = typeof clientItem === 'string' ? clientItem : clientItem.tag;
    const clientBase = clientTag.split('-')[0].toLowerCase();

    // 尋找支援列表中是否有同 base 的項目
    const baseMatch = supportedLanguages.find(s => s.toLowerCase() === clientBase || s.split('-')[0].toLowerCase() === clientBase);
    if (baseMatch) {
      steps.push({
        stage: 'Base Language Match (Prefix)',
        clientTag,
        matched: baseMatch,
        description: `前綴比對「${clientTag}」與支援語系「${baseMatch}」基底「${clientBase}」相符`
      });
      return { matched: baseMatch, algorithm: 'Base Language Match', steps };
    }
  }

  // 3. Fallback to Default
  steps.push({
    stage: 'Default Fallback',
    clientTag: 'none',
    matched: defaultLang,
    description: `無匹配語系，退回預設語系「${defaultLang}」`
  });

  return { matched: defaultLang, algorithm: 'Default Fallback', steps };
}

const server = http.createServer((req, res) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);

  // CORS 支援
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept-Language');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = parsedUrl.pathname;

  // API: /api/headers - 回傳用戶端請求的 HTTP 標頭與分析
  if (reqPath === '/api/headers') {
    const rawAcceptLang = req.headers['accept-language'] || '';
    const parsedAcceptLang = parseAcceptLanguage(rawAcceptLang);
    const userAgent = req.headers['user-agent'] || '';

    // 偵測是否為行動裝置
    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);

    const clientInfo = {
      serverTime: new Date().toISOString(),
      clientIp: req.socket.remoteAddress,
      headers: req.headers,
      rawAcceptLanguage: rawAcceptLang,
      parsedAcceptLanguage: parsedAcceptLang,
      userAgent: userAgent,
      clientPlatform: {
        isMobile,
        isIOS,
        isAndroid,
        secChUa: req.headers['sec-ch-ua'] || null,
        secChUaMobile: req.headers['sec-ch-ua-mobile'] || null,
        secChUaPlatform: req.headers['sec-ch-ua-platform'] || null,
        secChUaModel: req.headers['sec-ch-ua-model'] || null,
      },
      serverEnvironment: {
        nodeVersion: process.version,
        serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        serverLocale: Intl.DateTimeFormat().resolvedOptions().locale,
        envLANG: process.env.LANG || 'unset',
        envLC_ALL: process.env.LC_ALL || 'unset'
      }
    };

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(clientInfo, null, 2));
  }

  // API: /api/negotiate - 語系協商測試
  if (reqPath === '/api/negotiate') {
    const rawAcceptLang = req.headers['accept-language'] || '';
    const parsed = parseAcceptLanguage(rawAcceptLang);
    
    let supported = ['zh-TW', 'en-US', 'ja-JP', 'zh-CN', 'ko-KR'];
    let defaultLang = 'en-US';

    const querySupported = parsedUrl.searchParams.get('supported');
    const queryDefault = parsedUrl.searchParams.get('default');
    if (querySupported) {
      supported = querySupported.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (queryDefault) {
      defaultLang = queryDefault.trim();
    }

    const result = negotiateLanguage(parsed, supported, defaultLang);

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      rawAcceptLanguage: rawAcceptLang,
      parsedClientLanguages: parsed,
      supportedLanguages: supported,
      defaultLanguage: defaultLang,
      negotiationResult: result
    }, null, 2));
  }

  // API: /api/info - 伺服器與區網 IP 資訊
  if (reqPath === '/api/info') {
    const lanIps = getLocalIpAddresses();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      serverTime: new Date().toISOString(),
      primaryIp,
      lanIps,
      port: PORT
    }, null, 2));
  }

  // 靜態檔案伺服
  let normalizedPath = reqPath === '/' ? '/index.html' : reqPath;
  const safePath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>404 Not Found</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0b0f19; color: #f8fafc; }
            a { color: #38bdf8; text-decoration: none; padding: 10px 20px; border: 1px solid #38bdf8; border-radius: 8px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>404 - 找不到頁面</h1>
          <p>請求的路徑 <code>${reqPath}</code> 不存在。</p>
          <a href="/">返回 Navigator Language 測試主頁</a>
        </body>
        </html>
      `);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const lanIps = getLocalIpAddresses();
  console.log('\n======================================================================');
  console.log('🧪 Navigator Language & Locale 雙平台測試伺服器已啟動！');
  console.log('======================================================================');
  console.log(`\n💻 本機電腦測試網址:`);
  console.log(`   👉 http://localhost:${PORT}`);
  console.log(`   👉 http://127.0.0.1:${PORT}`);

  if (lanIps.length > 0) {
    console.log(`\n📱 行動裝置實機與 WebView 測試 (請連線至相同 Wi-Fi 區域網路):`);
    lanIps.forEach(({ name, address }) => {
      console.log(`   👉 http://${address}:${PORT}  (${name})`);
    });
  } else {
    console.log(`\n⚠️  未偵測到外部區網 IP，請確認 Wi-Fi 連線。`);
  }
  console.log('\n======================================================================\n');
});
