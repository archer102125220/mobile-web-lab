/**
 * Navigator Language & Locale Test Lab - Client Application Logic
 */

(function () {
  'use strict';

  // Global State
  let clientState = {
    language: navigator.language || '',
    languages: Array.from(navigator.languages || [navigator.language]),
    intlLocale: '',
    intlTimezone: '',
    serverHeaders: null,
    nativeInfo: null,
    isIOSWebView: false,
    isAndroidWebView: false,
    isMobileBrowser: false,
  };

  // =========================================================================
  // 1. UI Tab Switching
  // =========================================================================
  function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const panels = document.querySelectorAll('.tab-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-tab');
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });
  }

  // =========================================================================
  // 2. BCP 47 Subtag Parser
  // =========================================================================
  function parseLocaleSubtags(localeStr) {
    try {
      if (typeof Intl !== 'undefined' && Intl.Locale) {
        const loc = new Intl.Locale(localeStr);
        return {
          baseName: loc.baseName || loc.language,
          language: loc.language || '--',
          region: loc.region || '--',
          script: loc.script || '--',
        };
      }
    } catch (e) {
      // Fallback manual regex
    }
    const parts = (localeStr || '').split('-');
    return {
      baseName: parts[0] || '--',
      language: parts[0] || '--',
      region: parts[1] ? parts[1].toUpperCase() : '--',
      script: parts.length > 2 ? parts[1] : '--',
    };
  }

  // =========================================================================
  // 3. Platform & Environment Detection
  // =========================================================================
  function detectPlatform() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    // Check for iOS WKWebView Bridge
    const hasIOSBridge = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.NativeBridge);
    // Check for Android WebView Bridge
    const hasAndroidBridge = !!(window.NativeBridge && typeof window.NativeBridge.getNativeLocale === 'function');

    clientState.isIOSWebView = hasIOSBridge || (isIOS && !/Safari/i.test(ua));
    clientState.isAndroidWebView = hasAndroidBridge || (isAndroid && /Version\/[0-9.]+/i.test(ua) && /Chrome/i.test(ua));
    clientState.isMobileBrowser = (isIOS || isAndroid) && !clientState.isIOSWebView && !clientState.isAndroidWebView;

    const pill = document.getElementById('platform-pill');
    const label = document.getElementById('platform-label');

    if (clientState.isIOSWebView) {
      pill.className = 'status-pill webview-ios';
      label.textContent = '🍏 iOS WKWebView 容器';
    } else if (clientState.isAndroidWebView) {
      pill.className = 'status-pill webview-android';
      label.textContent = '🤖 Android WebView 容器';
    } else if (isIOS) {
      pill.className = 'status-pill browser';
      label.textContent = '🍏 Mobile Safari 瀏覽器';
    } else if (isAndroid) {
      pill.className = 'status-pill browser';
      label.textContent = '🤖 Mobile Chrome 瀏覽器';
    } else {
      pill.className = 'status-pill browser';
      label.textContent = '💻 桌面端瀏覽器';
    }
  }

  // =========================================================================
  // 4. Update Client-Side Data & Hero Section
  // =========================================================================
  function updateClientDiagnostics() {
    clientState.language = navigator.language || 'unset';
    clientState.languages = Array.from(navigator.languages || [navigator.language]);

    try {
      const dtOptions = Intl.DateTimeFormat().resolvedOptions();
      clientState.intlLocale = dtOptions.locale || '--';
      clientState.intlTimezone = dtOptions.timeZone || '--';
    } catch (e) {
      clientState.intlLocale = clientState.language;
      clientState.intlTimezone = '--';
    }

    const subtags = parseLocaleSubtags(clientState.language);

    // Hero Section
    const heroPrimary = document.getElementById('hero-primary-lang');
    const heroDisplayName = document.getElementById('hero-display-name');
    const heroBase = document.getElementById('hero-base-lang');
    const heroRegion = document.getElementById('hero-region');
    const heroScript = document.getElementById('hero-script');
    const heroTimezone = document.getElementById('hero-timezone');

    if (heroPrimary) heroPrimary.textContent = clientState.language;
    if (heroBase) heroBase.textContent = subtags.language;
    if (heroRegion) heroRegion.textContent = subtags.region;
    if (heroScript) heroScript.textContent = subtags.script;
    if (heroTimezone) heroTimezone.textContent = clientState.intlTimezone;

    // Display Name in user's own language
    try {
      if (typeof Intl.DisplayNames !== 'undefined') {
        const dn = new Intl.DisplayNames([clientState.language, 'en'], { type: 'language' });
        const name = dn.of(clientState.language) || dn.of(subtags.language);
        if (heroDisplayName) heroDisplayName.textContent = name || clientState.language;
      } else {
        if (heroDisplayName) heroDisplayName.textContent = clientState.language;
      }
    } catch (e) {
      if (heroDisplayName) heroDisplayName.textContent = clientState.language;
    }

    // Client Card
    const valClientLang = document.getElementById('val-client-language');
    const valClientCount = document.getElementById('val-client-languages-count');
    const valClientList = document.getElementById('val-client-languages-list');
    const valClientIntlLocale = document.getElementById('val-client-intl-locale');
    const valClientIntlTz = document.getElementById('val-client-intl-tz');

    if (valClientLang) valClientLang.textContent = clientState.language;
    if (valClientCount) valClientCount.textContent = `${clientState.languages.length} 個偏好`;
    if (valClientIntlLocale) valClientIntlLocale.textContent = clientState.intlLocale;
    if (valClientIntlTz) valClientIntlTz.textContent = clientState.intlTimezone;

    if (valClientList) {
      valClientList.innerHTML = '';
      clientState.languages.forEach((lang, index) => {
        const pill = document.createElement('div');
        pill.className = 'lang-pill';
        pill.innerHTML = `<span class="lang-rank">${index + 1}</span> <span>${lang}</span>`;
        valClientList.appendChild(pill);
      });
    }
  }

  // =========================================================================
  // 5. Fetch Server-Side HTTP Headers (/api/headers)
  // =========================================================================
  async function fetchServerHeaders() {
    try {
      const res = await fetch('/api/headers');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      clientState.serverHeaders = data;

      const valRaw = document.getElementById('val-server-raw-accept');
      const valParsedList = document.getElementById('val-server-parsed-accept');
      const valClientIp = document.getElementById('val-server-client-ip');
      const valChPlatform = document.getElementById('val-server-ch-platform');

      if (valRaw) valRaw.textContent = data.rawAcceptLanguage || '(無 Accept-Language 標頭)';
      if (valClientIp) valClientIp.textContent = data.clientIp || '--';
      if (valChPlatform) {
        const platform = data.clientPlatform.secChUaPlatform || data.clientPlatform.secChUa || '無 Client Hints';
        valChPlatform.textContent = platform;
      }

      if (valParsedList) {
        valParsedList.innerHTML = '';
        if (data.parsedAcceptLanguage && data.parsedAcceptLanguage.length > 0) {
          data.parsedAcceptLanguage.forEach((item, index) => {
            const pill = document.createElement('div');
            pill.className = 'lang-pill';
            pill.innerHTML = `
              <span class="lang-rank">${index + 1}</span>
              <strong>${item.tag}</strong>
              <span style="color: var(--text-muted); font-size: 11px;">(q=${item.q})</span>
            `;
            valParsedList.appendChild(pill);
          });
        } else {
          valParsedList.innerHTML = '<span class="tag-badge">無解析項目</span>';
        }
      }
    } catch (err) {
      console.error('Failed to fetch server headers:', err);
      const valRaw = document.getElementById('val-server-raw-accept');
      if (valRaw) valRaw.textContent = `連線錯誤: ${err.message}`;
    }
  }

  // =========================================================================
  // 6. Native Bridge Integration (iOS & Android)
  // =========================================================================
  function requestNativeLocaleInfo() {
    const valNativeStatus = document.getElementById('val-native-status');
    const valNativeSystemLocale = document.getElementById('val-native-system-locale');
    const valNativePreferredList = document.getElementById('val-native-preferred-list');
    const valNativeTimezone = document.getElementById('val-native-timezone');
    const nativeBadge = document.getElementById('native-badge');

    // Callback handler for Native response
    window.onNativeLocaleReceived = function (info) {
      clientState.nativeInfo = info;
      if (valNativeStatus) valNativeStatus.textContent = `已連接 (${info.platform || 'Native'})`;
      if (nativeBadge) {
        nativeBadge.textContent = info.platform || 'Native Connected';
        nativeBadge.className = 'card-badge tag-badge emerald';
      }
      if (valNativeSystemLocale) valNativeSystemLocale.textContent = info.systemLocale || '--';
      if (valNativeTimezone) valNativeTimezone.textContent = info.timezone || '--';

      if (valNativePreferredList) {
        valNativePreferredList.innerHTML = '';
        const prefList = info.preferredLanguages || [];
        if (prefList.length > 0) {
          prefList.forEach((lang, idx) => {
            const pill = document.createElement('div');
            pill.className = 'lang-pill';
            pill.innerHTML = `<span class="lang-rank">${idx + 1}</span> <span>${lang}</span>`;
            valNativePreferredList.appendChild(pill);
          });
        } else {
          valNativePreferredList.innerHTML = '<span class="tag-badge">無清單</span>';
        }
      }

      logEvent(`[Native Bridge] 成功接收原生語系資訊: ${info.systemLocale} (${(info.preferredLanguages || []).join(', ')})`);
    };

    // 1. Try iOS WKScriptMessageHandler
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.NativeBridge) {
      try {
        window.webkit.messageHandlers.NativeBridge.postMessage({ action: 'getNativeLocale' });
        if (valNativeStatus) valNativeStatus.textContent = '已發送 iOS Bridge 請求...';
        return;
      } catch (e) {
        console.warn('iOS NativeBridge postMessage failed:', e);
      }
    }

    // 2. Try Android JavascriptInterface
    if (window.NativeBridge && typeof window.NativeBridge.getNativeLocaleJson === 'function') {
      try {
        const jsonStr = window.NativeBridge.getNativeLocaleJson();
        const info = JSON.parse(jsonStr);
        window.onNativeLocaleReceived(info);
        return;
      } catch (e) {
        console.warn('Android NativeBridge getNativeLocaleJson failed:', e);
      }
    }

    // 3. Fallback: Standalone Mobile Browser
    setTimeout(() => {
      if (!clientState.nativeInfo) {
        if (valNativeStatus) valNativeStatus.textContent = '一般手機/桌面瀏覽器模式 (未掛載 NativeBridge)';
        if (nativeBadge) {
          nativeBadge.textContent = 'Mobile Browser';
          nativeBadge.className = 'card-badge tag-badge cyan';
        }
        if (valNativeSystemLocale) valNativeSystemLocale.textContent = '由瀏覽器管理';
        if (valNativeTimezone) valNativeTimezone.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || '--';
        if (valNativePreferredList) {
          valNativePreferredList.innerHTML = '<span class="tag-badge">同 navigator.languages</span>';
        }
      }
    }, 500);
  }

  // =========================================================================
  // 7. Intl API Diagnostic Suite Benchmarks
  // =========================================================================
  function runIntlDiagnostics() {
    const loc = clientState.language || 'en';

    // 1. DateTimeFormat
    try {
      const now = new Date();
      const dtFull = new Intl.DateTimeFormat(loc, {
        dateStyle: 'full',
        timeStyle: 'medium',
      }).format(now);
      const dtWeekday = new Intl.DateTimeFormat(loc, {
        weekday: 'long',
        era: 'short',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(now);

      const elDtFull = document.getElementById('intl-dt-full');
      const elDtWeekday = document.getElementById('intl-dt-weekday');
      if (elDtFull) elDtFull.textContent = dtFull;
      if (elDtWeekday) elDtWeekday.textContent = dtWeekday;
    } catch (e) {
      console.warn('Intl.DateTimeFormat error:', e);
    }

    // 2. RelativeTimeFormat
    try {
      if (typeof Intl.RelativeTimeFormat !== 'undefined') {
        const rtf = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' });
        const rel3Days = rtf.format(-3, 'day');
        const elRel = document.getElementById('intl-rel-time');
        if (elRel) elRel.textContent = rel3Days;
      }
    } catch (e) {
      const elRel = document.getElementById('intl-rel-time');
      if (elRel) elRel.textContent = '不支援 RelativeTimeFormat';
    }

    // 3. NumberFormat & Currency
    try {
      const sampleNumber = 1234567.89;
      // Determine appropriate currency based on locale region
      let currencyCode = 'USD';
      if (loc.includes('TW')) currencyCode = 'TWD';
      else if (loc.includes('JP')) currencyCode = 'JPY';
      else if (loc.includes('CN')) currencyCode = 'CNY';
      else if (loc.includes('EU') || loc.includes('DE') || loc.includes('FR')) currencyCode = 'EUR';

      const currencyFmt = new Intl.NumberFormat(loc, { style: 'currency', currency: currencyCode }).format(sampleNumber);
      const compactFmt = new Intl.NumberFormat(loc, { notation: 'compact', compactDisplay: 'short' }).format(sampleNumber);
      const percentFmt = new Intl.NumberFormat(loc, { style: 'percent', minimumFractionDigits: 1 }).format(0.854);

      const elCurr = document.getElementById('intl-num-currency');
      const elCompact = document.getElementById('intl-num-compact');
      const elPercent = document.getElementById('intl-num-percent');

      if (elCurr) elCurr.textContent = `${currencyFmt} (${currencyCode})`;
      if (elCompact) elCompact.textContent = compactFmt;
      if (elPercent) elPercent.textContent = percentFmt;
    } catch (e) {
      console.warn('Intl.NumberFormat error:', e);
    }

    // 4. DisplayNames
    try {
      if (typeof Intl.DisplayNames !== 'undefined') {
        const dn = new Intl.DisplayNames([loc, 'en'], { type: 'language' });
        const elEn = document.getElementById('intl-dn-en');
        const elZhtw = document.getElementById('intl-dn-zhtw');
        const elJa = document.getElementById('intl-dn-ja');

        if (elEn) elEn.textContent = dn.of('en') || 'English';
        if (elZhtw) elZhtw.textContent = dn.of('zh-TW') || '繁體中文 (台灣)';
        if (elJa) elJa.textContent = dn.of('ja') || '日本語';
      }
    } catch (e) {
      console.warn('Intl.DisplayNames not supported');
    }

    // 5. PluralRules
    try {
      if (typeof Intl.PluralRules !== 'undefined') {
        const pr = new Intl.PluralRules(loc);
        const elP1 = document.getElementById('intl-plural-1');
        const elP2 = document.getElementById('intl-plural-2');
        if (elP1) elP1.textContent = pr.select(1);
        if (elP2) elP2.textContent = pr.select(2);
      }
    } catch (e) {}

    // 6. Collator Sort
    try {
      if (typeof Intl.Collator !== 'undefined') {
        const words = ['蘋果 (Apple)', '香蕉 (Banana)', '橘子 (Orange)', '芭樂 (Guava)'];
        const collator = new Intl.Collator(loc);
        words.sort(collator.compare);
        const elCol = document.getElementById('intl-collator-test');
        if (elCol) elCol.textContent = words.join(' < ');
      }
    } catch (e) {}
  }

  // =========================================================================
  // 8. Language Negotiation Simulator
  // =========================================================================
  function runNegotiationSimulatorClient() {
    const inputSupported = document.getElementById('sim-supported').value;
    const inputDefault = document.getElementById('sim-default').value;

    const supportedList = inputSupported.split(',').map(s => s.trim()).filter(Boolean);
    const defaultLang = inputDefault.trim() || 'en';

    const clientLangs = clientState.languages.length > 0 ? clientState.languages : [clientState.language];

    const steps = [];
    let matched = null;
    let algo = '';

    // Step 1: Exact Match
    for (const clientTag of clientLangs) {
      const match = supportedList.find(s => s.toLowerCase() === clientTag.toLowerCase());
      if (match) {
        matched = match;
        algo = 'Exact Match (精確相符)';
        steps.push({
          badge: '1. 完全相符',
          desc: `用戶端偏好「${clientTag}」與支援清單「${match}」完全一致。`,
        });
        break;
      }
    }

    // Step 2: Base language (Prefix) matching
    if (!matched) {
      for (const clientTag of clientLangs) {
        const base = clientTag.split('-')[0].toLowerCase();
        const match = supportedList.find(s => s.toLowerCase() === base || s.split('-')[0].toLowerCase() === base);
        if (match) {
          matched = match;
          algo = 'Base Language Match (基底語言相符)';
          steps.push({
            badge: '2. 基底前綴匹配',
            desc: `用戶端「${clientTag}」與支援語系「${match}」擁有相同語言基底「${base}」。`,
          });
          break;
        }
      }
    }

    // Step 3: Default Fallback
    if (!matched) {
      matched = defaultLang;
      algo = 'Default Fallback (預設退回)';
      steps.push({
        badge: '3. 預設退回',
        desc: `無任何支援語系相符，退回網站預設語系「${defaultLang}」。`,
      });
    }

    renderSimResult(matched, algo, steps);
  }

  async function runNegotiationSimulatorServer() {
    const inputSupported = encodeURIComponent(document.getElementById('sim-supported').value);
    const inputDefault = encodeURIComponent(document.getElementById('sim-default').value);

    try {
      const res = await fetch(`/api/negotiate?supported=${inputSupported}&default=${inputDefault}`);
      const data = await res.json();
      const r = data.negotiationResult;

      const steps = (r.steps || []).map(s => ({
        badge: s.stage,
        desc: s.description,
      }));

      renderSimResult(r.matched, `Server-Side ${r.algorithm}`, steps);
    } catch (err) {
      alert(`伺服器協商失敗: ${err.message}`);
    }
  }

  function renderSimResult(matched, algo, steps) {
    const box = document.getElementById('sim-result-box');
    const matchedEl = document.getElementById('sim-matched-lang');
    const algoEl = document.getElementById('sim-algo-name');
    const stepsEl = document.getElementById('sim-steps-timeline');

    if (box) box.style.display = 'block';
    if (matchedEl) matchedEl.textContent = matched;
    if (algoEl) algoEl.textContent = algo;

    if (stepsEl) {
      stepsEl.innerHTML = '';
      steps.forEach(step => {
        const item = document.createElement('div');
        item.className = 'step-item';
        item.innerHTML = `
          <span class="step-badge">${step.badge}</span>
          <span>${step.desc}</span>
        `;
        stepsEl.appendChild(item);
      });
    }
  }

  // =========================================================================
  // 9. Event Log & Dynamic Languagechange Testing
  // =========================================================================
  function logEvent(message) {
    const logBox = document.getElementById('event-log');
    if (!logBox) return;

    const timeStr = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'event-entry';
    entry.innerHTML = `<span class="time">[${timeStr}]</span> ${message}`;
    logBox.prepend(entry);
  }

  function initDynamicEvents() {
    window.addEventListener('languagechange', (e) => {
      logEvent(`⚡ 捕捉到 window.languagechange 事件！新 navigator.language: <strong>${navigator.language}</strong>`);
      updateClientDiagnostics();
      runIntlDiagnostics();
    });

    const btnDispatch = document.getElementById('btn-dispatch-event');
    if (btnDispatch) {
      btnDispatch.addEventListener('click', () => {
        logEvent('🔔 手動觸發 dispatchEvent(new Event("languagechange"))');
        window.dispatchEvent(new Event('languagechange'));
      });
    }

    const btnMockJa = document.getElementById('btn-mock-japanese');
    if (btnMockJa) {
      btnMockJa.addEventListener('click', () => {
        try {
          Object.defineProperty(navigator, 'language', { value: 'ja-JP', configurable: true });
          Object.defineProperty(navigator, 'languages', { value: ['ja-JP', 'ja', 'en-US'], configurable: true });
          logEvent('🇯🇵 透過 Object.defineProperty 模擬將 navigator.language 變更為 ja-JP');
          window.dispatchEvent(new Event('languagechange'));
        } catch (e) {
          logEvent(`⚠️ 模擬覆寫失敗: ${e.message}`);
        }
      });
    }

    const btnMockEn = document.getElementById('btn-mock-english');
    if (btnMockEn) {
      btnMockEn.addEventListener('click', () => {
        try {
          Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
          Object.defineProperty(navigator, 'languages', { value: ['en-US', 'en'], configurable: true });
          logEvent('🇺🇸 透過 Object.defineProperty 模擬將 navigator.language 變更為 en-US');
          window.dispatchEvent(new Event('languagechange'));
        } catch (e) {
          logEvent(`⚠️ 模擬覆寫失敗: ${e.message}`);
        }
      });
    }

    const btnClear = document.getElementById('btn-clear-log');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        const logBox = document.getElementById('event-log');
        if (logBox) logBox.innerHTML = '';
      });
    }
  }

  // =========================================================================
  // 10. QR Code & Device Connection Info
  // =========================================================================
  async function initQRCodeAndConnection() {
    try {
      const res = await fetch('/api/info');
      if (!res.ok) return;
      const data = await res.json();

      const host = window.location.hostname;
      const port = data.port || 3000;
      let targetIp = data.primaryIp || host;

      // If we are currently accessing via LAN IP, use that
      if (host !== 'localhost' && host !== '127.0.0.1') {
        targetIp = host;
      }

      const fullUrl = `http://${targetIp}:${port}`;
      const qrTargetEl = document.getElementById('qr-target-url');
      if (qrTargetEl) qrTargetEl.textContent = fullUrl;

      // Render SVG QR Code
      const qrBox = document.getElementById('qr-code-box');
      if (qrBox && typeof qrcode !== 'undefined') {
        try {
          const qr = qrcode(0, 'M');
          qr.addData(fullUrl);
          qr.make();
          qrBox.innerHTML = qr.createSvgTag(5, 2);
        } catch (e) {
          qrBox.innerHTML = `<span style="color: #666;">無法繪製 QR Code</span>`;
        }
      }

      const btnCopy = document.getElementById('btn-copy-url');
      if (btnCopy) {
        btnCopy.addEventListener('click', () => {
          navigator.clipboard.writeText(fullUrl).then(() => {
            btnCopy.textContent = '✅ 已複製網址！';
            setTimeout(() => { btnCopy.textContent = '📋 複製連線網址'; }, 2000);
          }).catch(() => {
            alert(`請手動複製: ${fullUrl}`);
          });
        });
      }
    } catch (e) {
      console.warn('Failed to load server info for QR code:', e);
    }
  }

  // =========================================================================
  // Initialization Lifecycle
  // =========================================================================
  function init() {
    initTabs();
    detectPlatform();
    updateClientDiagnostics();
    fetchServerHeaders();
    requestNativeLocaleInfo();
    runIntlDiagnostics();
    initDynamicEvents();
    initQRCodeAndConnection();

    // Event Listeners for Simulator
    const btnSimClient = document.getElementById('btn-run-sim-client');
    const btnSimServer = document.getElementById('btn-run-sim-server');
    const btnRefresh = document.getElementById('btn-refresh-data');

    if (btnSimClient) btnSimClient.addEventListener('click', runNegotiationSimulatorClient);
    if (btnSimServer) btnSimServer.addEventListener('click', runNegotiationSimulatorServer);
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        updateClientDiagnostics();
        fetchServerHeaders();
        requestNativeLocaleInfo();
        runIntlDiagnostics();
        logEvent('🔄 手動重新整理所有語系與標頭資訊');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
