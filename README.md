# Mobile Web Lab 🧪📱

跨平台行動端 Web / WebView 相容性、行為邊界與地雷特徵驗證實驗室。

> **Mission**: 消除跨平台與跨領域（Web vs. Native）協作時的認知落差與黑魔法假設，透過具體的實驗基準（Benchmark）與真實裝置運作結果，作為技術決策與架構設計的依據。

[English Version](README_en.md)

---

## 專案目錄與實驗模組

本專案採用獨立平鋪結構（Flat Multi-project），各實驗模組彼此獨立運作、互不干擾，可依照測試需求單獨執行或建置：

```text
mobile-web-lab/
├── webview-interceptor/      # [實驗 1] 雙平台 WebView 跳轉與彈窗攔截
├── ios-safe-area-inset/      # [實驗 2] iOS Web Mobile 安全區域與 Viewport 測試
└── navigator-language/       # [實驗 3] 跨平台語系與 Locale 判斷測試
```

---

### 🔬 實驗模組總覽

| 模組名稱 | 涵蓋平台 | 核心測試目標 | 快速連結 |
| :--- | :--- | :--- | :--- |
| **`webview-interceptor`** | 🤖 Android<br>🍏 iOS | • 當頁跳轉 (`location.href`, `<a href>`) 攔截<br>• 另開分頁 (`window.open`) 與 Popup Blocker 限制<br>• 微任務/宏任務非同步跳轉 (Event Loop)<br>• SPA 路由切換 (`history.pushState`) 攔截盲區<br>• 表單跳轉 (POST Body 丟失/穿透原生缺陷)<br>• 伺服器端延遲跳轉 (Delayed 302) 與中繼表單架構 | [前往模組 ➔](./webview-interceptor/README.md) |
| **`ios-safe-area-inset`** | 🍏 iOS (Safari / PWA) | • `viewport-fit=cover` 行為驗證<br>• CSS `env(safe-area-inset-*)` 邊界測量與像素換算<br>• 瀏海 (Notch)、動態島 (Dynamic Island) 與 Home Indicator 適配<br>• 旋轉螢幕 (Orientation) 與組件排版即時視覺化 | [前往模組 ➔](./ios-safe-area-inset/README.md) |
| **`navigator-language`** | 🤖 Android<br>🍏 iOS<br>🌐 Web | • 系統設定語系 vs. 瀏覽器 App 語系 vs. WebView 語系<br>• `navigator.language` / `navigator.languages` 陣列回傳順序<br>• HTTP `Accept-Language` 標頭加權解析與 RFC 4647 協商模擬<br>• ECMAScript 402 `Intl` 全套 API 跨平台相容性基準 | [前往模組 ➔](./navigator-language/README.md) |

---

## 快速上手 (Quick Start)

各模組皆為完全獨立之專案，進入各專案目錄後即可直接執行：

### 1. 運行 `webview-interceptor`
```bash
# 啟動 Mock Server
cd webview-interceptor/mock-server
node server.js

# 開啟 iOS 專案 (Xcode)
open webview-interceptor/IOS/WebViewInterceptorDemo.xcodeproj

# 開啟 Android 專案 (Android Studio)
# 打開 webview-interceptor/Android 目錄
```

### 2. 運行 `ios-safe-area-inset`
```bash
cd ios-safe-area-inset
node server.js
# 終端機將輸出局域網網址與 QR Code，使用 iPhone 掃描即可測試
```

### 3. 運行 `navigator-language`
```bash
# 啟動 Node.js Web 伺服器 (支援自動區網探測與 Native 設定注入)
cd navigator-language
node server.js

# 開啟 iOS 專案 (Xcode)
open navigator-language/IOS/NavigatorLanguageDemo.xcodeproj

# 開啟 Android 專案 (Android Studio)
# 打開 navigator-language/Android 目錄
```

---

## 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權。
