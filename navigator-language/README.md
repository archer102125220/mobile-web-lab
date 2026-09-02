# Navigator Language 跨平台語系檢測實驗室 🧪🌐

跨平台（iOS WKWebView、Android WebView、Mobile Safari、Chrome for Android 與桌面瀏覽器）語系判定、Locale 決定順序與 HTTP `Accept-Language` 協商機制實驗室。

[English Version](README_en.md)

---

## 🔬 實驗目標與驗證項目

1. **Client-Side JS 語系判定**：
   - 測量 `navigator.language`、`navigator.languages` 陣列長度與回傳順序。
   - `Intl` 國際化 API 全套解析（`DateTimeFormat`、`NumberFormat`、`DisplayNames`、`PluralRules`、`Collator`）。
2. **Server-Side HTTP 標頭檢驗**：
   - 即時解析 `Accept-Language` 原始字串與 `q-factor` 品質加權降冪排序。
   - 分析 `User-Agent` 與 Client Hints (`Sec-CH-UA-Platform`) 對語系判定的影響。
3. **雙平台 Native vs Web 差異矩陣**：
   - **iOS**：比對系統語系、iOS 13+ App 獨立語言、`Locale.preferredLanguages` 與 WKWebView 是否同步。
   - **Android**：比對 Android 系統語系、`LocaleList.getDefault()` 與 Android WebView 內部解析之一致性。
4. **語系協商模擬器 (Language Negotiation Simulator)**：
   - 實作 RFC 4647 Lookup & Base Language Matching 演算法，視覺化展示多語系網站的最終判定步驟。
5. **動態事件監聽**：
   - 即時捕捉 `window.addEventListener('languagechange')` 事件與模擬動態切換。

---

## 📂 專案結構

```text
navigator-language/
├── package.json              # 專案相依與啟動腳本 (yarn start / dev)
├── server.js                 # 零相依 Node.js Web Server (支援區網探測與自動注入 IP)
├── public/                   # 現代化前端診斷儀表板
│   ├── index.html            # 語意化 HTML5 + 6 大檢測分頁
│   ├── style.css             # 極致 Dark Mode 玻璃擬態設計
│   ├── app.js                # 用戶端檢測、Intl 基準測試與 JSBridge 邏輯
│   └── qrcode.js             # 零相依輕量 SVG QR Code 繪製器
├── IOS/                      # iOS 原生專案 (Xcode)
│   ├── NavigatorLanguageDemo.xcodeproj
│   └── NavigatorLanguageDemo/
│       ├── NavigatorLanguageDemoApp.swift
│       ├── ContentView.swift
│       ├── ViewController.swift  # WKWebView + NativeBridge 原生語系匯出
│       └── ServerConfig.swift   # 由 server.js 自動產生的連線 IP
├── Android/                  # Android 原生專案 (Android Studio)
│   ├── build.gradle.kts
│   ├── env.properties        # 由 server.js 自動產生的連線 IP
│   └── app/
│       └── src/main/
│           ├── AndroidManifest.xml
│           └── java/com/example/navigatorlanguagedemo/MainActivity.kt # WebView + JSBridge
└── knowledge/
    └── locale-resolution-rules.md # 語系決定機制深度技術筆記
```

---

## 🚀 快速上手 (Quick Start)

### 步驟 1：啟動 Node.js Web 伺服器

```bash
cd navigator-language
node server.js
```

啟動後終端機將輸出本機網址、區域網路網址，並自動寫入設定至 iOS (`ServerConfig.swift`) 與 Android (`env.properties`)：

```text
======================================================================
🧪 Navigator Language & Locale 雙平台測試伺服器已啟動！
======================================================================

💻 本機電腦測試網址:
   👉 http://localhost:3000
   👉 http://127.0.0.1:3000

📱 行動裝置實機與 WebView 測試 (請連線至相同 Wi-Fi 區域網路):
   👉 http://192.168.1.100:3000  (en0)
======================================================================
```

---

### 步驟 2：選擇測試方式

#### 方式 A：一般手機瀏覽器 (Mobile Safari / Chrome)
1. 確保手機與電腦連線至同一個 Wi-Fi。
2. 使用手機相機掃描網頁上的 QR Code，或直接於瀏覽器輸入區域網路 IP。
3. 儀表板將自動啟動「一般手機瀏覽器模式」。

#### 方式 B：iOS WKWebView 殼層
1. 使用 Xcode 開啟 `navigator-language/IOS/NavigatorLanguageDemo.xcodeproj`。
2. 選擇 iPhone 模擬器或連接實機執行。
3. App 啟動後將自動載入 Web 伺服器，並透過 `NativeBridge` 回傳 iOS 原生 `Locale.preferredLanguages`。
4. **測試情境**：前往 iPhone「設定 > NavigatorLanguageDemo > 偏好語言」切換語系，觀察 WebView 與 NativeBridge 數值。

#### 方式 C：Android WebView 殼層
1. 使用 Android Studio 開啟 `navigator-language/Android` 目錄。
2. 執行於 Android 模擬器或實機。
3. App 啟動後將自動連線並透過 `NativeBridge` 回傳 Android `LocaleList.getDefault()`。
4. **測試情境**：前往 Android「設定 > 系統 > 語言與輸入 > 語言」調整語言優先順序，觀察 WebView 反映。

---

## ⚖️ 差異比對速查表

| 維度 | iOS (WebKit) | Android (Chromium) |
| :--- | :--- | :--- |
| **首選語系** | `navigator.language` 即時反映系統/App 偏好 | `navigator.language` 即時反映系統/Chrome 偏好 |
| **語系陣列** | `navigator.languages` 包含所有使用者指定語系 | `navigator.languages` 包含系統或 Chrome 排序清單 |
| **Per-App 獨立語系** | iOS 13+ 完美繼承至 WKWebView | Android 13+ 需注意 Context Locales 配置 |
| **HTTP 標頭** | 自動帶出帶 q-factor 的 `Accept-Language` | 自動發送相應之品質加權 `Accept-Language` |

---

## 授權條款 (License)

本專案採用 [MIT License](../LICENSE) 授權。
