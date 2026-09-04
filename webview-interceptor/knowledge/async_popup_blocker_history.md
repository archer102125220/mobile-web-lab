# 跨平台 WebView 的非同步彈窗防禦機制與 JSBridge 架構

[English Version](async_popup_blocker_history_en.md)

本文件深入探討在現代前端開發 (Vue / React / 原生 JS) 中，使用非同步呼叫 API 後觸發 `window.open`、動態 `<a>` 標籤或 `<form target="_blank">` 時，在行動裝置 App 內嵌 WebView（iOS WKWebView 與 Android WebView）中遭遇攔截失效或被底層封殺的底層成因、引擎歷史演進、避坑指南與標準架構解決方案。

> [!NOTE]
> **📱 實測驗證基準環境 (Benchmark Environment)**
> - 🍏 **iOS**：iPhone Xs (iOS 18.7.10 / WebKit)
> - 🤖 **Android**：Samsung Galaxy Z Fold5 (Android 16 / One UI 8.5 / Chromium WebView)

---

## 1. 問題現象：前端非同步彈窗失敗

現代的前端開發習慣為「資料驅動畫面」。例如以下常見邏輯：
1. 使用者點擊按鈕
2. 觸發 Function 發送 HTTP 請求 (Ajax / Fetch)
3. 等待非同步回應 (Promise `await` 或 `.then`)
4. 取得新網址後，執行 `window.open(newUrl, '_blank')` 或表單跳轉

在一般桌面瀏覽器上，只要非同步等待時間不長，通常可以成功彈出新分頁。**但在行動裝置的 WebView 上，這個非同步彈窗往往會面臨嚴格的底層審查與封殺。**

---

## 2. 失敗的根本原因：使用者手勢遺失 (User Gesture Context Loss) 與防禦模式

現代 App（特別是金融、電商、超級 App）出於資安與防禦機制，通常會將 WebView 的「允許腳本自動開新視窗」權限關閉：
- **iOS**: `preferences.javaScriptCanOpenWindowsAutomatically = false`
- **Android**: `settings.setJavaScriptCanOpenWindowsAutomatically(false)`

這個嚴格設定的目的是：
1. **防範蓋版廣告與彈窗轟炸 (Popup Abuse)**：防止惡意代碼在背景無限開啟新視窗耗盡手機 RAM 資源。
2. **防範釣魚詐騙 (Phishing & UI Spoofing)**：防止惡意腳本偷偷倒數後，突然彈出偽造的系統登入頁面騙取帳號密碼。強制將跳轉綁定在「實體點擊」的當下，讓使用者清楚知道是自己的點擊觸發了新視窗。
3. **防止惡意背景跳轉商店 (Drive-by Redirects)**：封殺未經使用者同意直接喚起 App Store 或外部 App 的跳轉行為。
4. **手機硬體資源嚴格管控**：每一個新視窗都會消耗大量的手機記憶體 (RAM)，背景偷偷開啟會導致 App 崩潰。

### 為什麼非同步會被封殺？
當前端透過 `setTimeout` 延遲或發起網路請求等待時，Event Loop 會中斷（可以想像成被切為不同於使用者操作事件的執行緒做後續動作）。當非同步任務結束並執行到 `window.open` 時，系統底層核發的「實體點擊通行證 (User Gesture Token / Transient Activation)」已經過期或遺失。
此時 WebView 會判定這是一個 **「沒有實體點擊（使用者操作）背書的惡意背景彈窗」**，進而將其無情封殺。

---

## 3. 解決方案：JSBridge 與伺服器端架構 (302 重導向 / 中繼表單)

面對上述嚴格的防禦機制，純前端的繞過手法（如建立隱藏 `<a>` 並觸發 `.click()`）極度不穩定且易被阻擋。目前業界有三種能保證 100% 成功率的標準架構解法：

### 解法一：放棄 URL 攔截，擁抱 JSBridge (最常見、最高自由度)

不要透過瀏覽器的 `window.open` 彈窗引擎，而是讓前端「直接命令」原生 App 去開畫面。

#### 前端實作方式：
```javascript
async function handleOpenUrl() {
    // 1. 等待非同步 API
    const newUrl = await fetchUrlFromBackend();
    
    // 2. 透過 JSBridge 呼叫 Native (不經過瀏覽器的彈窗引擎)
    if (window.AndroidApp && window.AndroidApp.openNewWindow) {
        window.AndroidApp.openNewWindow(newUrl); // Android
    } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.openNewWindow) {
        window.webkit.messageHandlers.openNewWindow.postMessage(newUrl); // iOS
    } else {
        window.open(newUrl, '_blank'); // 降級：一般桌面瀏覽器
    }
}
```

#### 原生端 (Android Kotlin) 實作範例：
```kotlin
class WebAppInterface(private val context: Context) {
    @JavascriptInterface
    fun openNewWindow(url: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        context.startActivity(intent)
    }
}
// 將介面注入給前端
webView.addJavascriptInterface(WebAppInterface(this), "AndroidApp")
```

#### 原生端 (iOS Swift) 實作範例：
```swift
class ViewController: UIViewController, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "openNewWindow", let urlString = message.body as? String, let url = URL(string: urlString) {
            UIApplication.shared.open(url)
        }
    }
}
// 註冊 MessageHandler
webView.configuration.userContentController.add(self, name: "openNewWindow")
```

#### JSBridge 架構優勢：
- **100% 成功率**：這等同於「前端呼叫原生 App 的 Function」，完全繞過 WebView 的惡意彈窗阻擋機制。
- **無視非同步延遲**：不管 API 請求花多久時間，只要一呼叫 JSBridge，原生端必定會執行，沒有手勢憑證過期的問題。
- **權責分明**：前端專心處理商業邏輯（取得網址），開啟視窗這種需要掌控螢幕畫面的事交還給原生 App。

---

### 解法二：伺服器端 302 重新導向 (Server-side 302 Redirect)

如果因為架構限制無法使用 JSBridge，另一種標準解法是**將非同步等待的過程轉移到伺服器端**。

與其在前端呼叫 `fetch` 等待結果後再執行 `window.open`（這會導致 Token 遺失），不如在使用者點擊的當下，**直接**以同步的方式執行 `window.open('https://api.yourdomain.com/get-url-and-redirect', '_blank')`。

- 伺服器端接收到該請求後，在後端進行非同步的資料庫查詢或邏輯運算。
- 運算完成後，伺服器直接回傳 `HTTP 302 Found` 狀態碼，並在 `Location` Header 中帶上目標網址。
- 瀏覽器原生支援 302 跳轉，會自動跟隨並轉向該網址。

#### 伺服器 302 跳轉的優勢：
- **完美繞過非同步限制**：因為前端是「同步」觸發 `window.open`，實體點擊通行證 (User Gesture Token) 完全沒有遺失。後續的非同步等待發生在網路連線層級，不會觸發 WebView 的安全攔截。
- **純 Web 技術**：不需依賴 Native App 開發 JSBridge，適合無法更改 App 端程式碼的情境。
- *(註：此方法會讓原生端攔截到的網址為中繼 API 網址，而非最終目的地網址；若原生端有依賴網址內容進行路由判斷的邏輯，需額外留意此差異。)*

---

### 解法三：伺服器端中繼頁面 + Web Form 跳轉 (Server-side Form Bridge: GET & POST)

當跳轉目標需要**攜帶大量參數或 POST 敏感資料**（例如第三方金流支付、OAuth 驗證等），單純的 302 GET 重導向可能無法滿足需求（URL 長度受限且敏感參數易洩漏於 URL 紀錄中）。此時「伺服器端中繼頁面 + Form 跳轉」是另一種強大的標準架構：

1. **前端同步開啟中繼頁**：使用者點擊時，前端以同步方式執行 `<a href="https://server.com/form-bridge?method=POST" target="_blank">` 開啟 Server 端的中繼跳轉頁。
2. **中繼頁內呼叫 API 並組裝表單**：中繼頁在獨立的新視窗環境載入後，於 `<script>` 內直接發起非同步 `fetch` 向後端 API 索取目的地 URL 與表單參數。
3. **提交同頁表單**：取得資料後，動態建立 `<form method="POST" action="targetUrl">`，塞入 hidden inputs 並調用 `form.submit()`。

#### 中繼表單跳轉的優勢：
- **完整支援 POST 與 Payload**：突破 URL 長度限制，完美支援需要 POST 傳參的業務場景。
- **無視非同步超時限制**：因為開新分頁是在使用者點擊的當下「同步」完成的，後續在中繼頁內部發生的非同步 API 等待（即便耗時超過 Android 5 秒或 iOS 1 秒寬限期），隨後的 `form.submit()` 屬於「同頁導航」而非「開新彈窗」，完全不會觸發 WebView 的彈窗阻擋機制 (Popup Blocker)！
- *(註：本專案的 mock-server 已實作此機制的完整 Demo，包含常規與 6 秒超時測試，實測雙平台皆可順利放行！)*

---

### 📊 三大解決方案深度架構比較表

| 方案維度 | 1. JSBridge 原生通訊 | 2. 伺服器端 302 重新導向 | 3. 伺服器端中繼 Form 跳轉 |
| :--- | :--- | :--- | :--- |
| **運作機制** | Web 呼叫 Native Function，原生直接叫起系統瀏覽器 | 前端同步開新窗，後端處理非同步並回傳 302 Location | 前端同步開中繼頁，中繼頁調用 API 並執行同頁 Form submit |
| **HTTP Method 支援** | 原生 Intent 自由定義 | 僅限 **GET** | 完整支援 **GET & POST** |
| **資料載荷 (Payload)** | 極大 (原生字串/JSON 傳參) | 中等 (受限於 URL 長度) | **極大** (支援大量 POST Body 參數) |
| **客戶端 App 依賴** | **高** (需 Android/iOS 雙端配合開發) | **零** (純 Web 標準技術) | **零** (純 Web 標準技術) |
| **非同步超時抵抗力** | 🟢 **100% 免疫** (無手勢憑證問題) | 🟢 **100% 免疫** (等待在網路連線層) | 🟢 **100% 免疫** (同頁導航不觸發彈窗封殺) |
| **最佳適用場景** | 自家企業 App 內嵌 H5 深度整合 | 無法修改 App 端、輕量 GET 跳轉 | 第三方金流支付、OAuth 敏感資料傳遞 |

---

## 4. 雙平台底層引擎對非同步 Token 的處置差異 (Event Loop)

即使將原生的彈窗權限關閉，雙平台底層瀏覽器引擎對於「使用者點擊通行證 (User Gesture Token)」的生命週期，有著截然不同的底層實作：

### Android (Chromium 引擎)：UAv2 5 秒寬限期、憑證刷新與 POST 盲區

1. **User Activation v2 (UAv2) 5 秒機制**：
   - 自 Chrome 72 開始引入了 **「User Activation v2 (UAv2)」** 機制。
   - 當使用者發生實體點擊時，系統會發放一個 **短暫的啟動憑證 (Transient Activation)**。
   - 在 Chromium 原始碼中，定義了常數 `kActivationLifespan` 為 **5000 毫秒 (5 秒)**。
   - **Chromium 允許這個憑證穿透非同步的 `Promise` (包含 `fetch`) 與 `setTimeout`**。因此，只要 API 回應速度或 `setTimeout` 的延遲時間在 5 秒內，執行 `window.open` 時憑證仍在有效期限內，Android 就會判定這「依然是使用者點擊觸發的」，進而放行彈窗。一旦超過 5 秒，憑證過期即遭 Popup Blocker 攔截。

2. **憑證刷新機制 (Token Refresh)**：
   - 這 5 秒並非從第一下點擊死死綁定。根據 Chromium 原始碼實作，只要在 5 秒倒數期間內，使用者**持續與畫面產生任何有效互動（例如滑動螢幕、觸碰、再次點擊）**，這個 5 秒的倒數計時器就會被**重置刷新**。

3. **Android `shouldOverrideUrlLoading` 不攔截 POST 限制**：
   - 官方明文規定 `WebViewClient.shouldOverrideUrlLoading` 永遠不會被 POST 請求觸發。
   - 當 Form POST 原頁跳轉時，會直接在 WebView 內部穿透載入；當 Form POST `_blank` 另開視窗時，雖然觸發 `WebChromeClient.onCreateWindow`，但臨時視窗不回呼 `shouldOverrideUrlLoading` 且未加入視圖，導致 Android 上 POST `_blank` 完全靜默。

---

### iOS (WebKit 引擎)：宏任務 1 秒限制、非同步演進史與 POST 攔截

iOS WebKit 的防禦機制與 Android (Chromium) 存在顯著差異，其歷史演進中也經歷了多次底層邏輯的修改：

1. **宏任務 (Macrotask) 與 1 秒寬限期**：
   - 早期許多開發者誤以為 iOS 只要進入 `setTimeout` 就會失效 (0 秒寬限期)，但實際上 WebKit 原始碼中曾有針對 `setTimeout` 的**「第一層 1 秒寬限期」**特殊處理 (可見於 GitHub WICG/interventions #12 的工程師討論)。
   - 如果使用者的點擊觸發了 `setTimeout`，且延遲在 1000 毫秒以內，第一層的 callback 是能繼承 Token 並彈窗的。但如果延遲超過 1 秒，或是發生「第二層 `setTimeout`」，Token 就會被判定中斷。

2. **微任務 (Microtask) 與 Promise 的歷史演進史**：
   - **【早期寬鬆期】2018 年以前 (iOS 12 早期及之前)**：當時的 WebKit 針對純微任務 (如 `Promise.resolve().then()`) 其實是**允許繼承手勢**的 (在 Mozilla Bugzilla #1469730 中，開發者證實了在 2018 年時 Safari 就能順利從微任務中觸發彈窗)。在當前 Event Loop 週期結束前執行的純微任務，大多能順利觸發彈窗。
   - **【Fetch / 非同步網路請求的歷史嚴格封殺】**：雖然純微任務可以過關，且 WebKit 在 2020 年 (WebKit Bugzilla #215014) 曾經針對 **WebAuthn** 等特定 API 實作了透過 Promise 轉送手勢的機制，但這在過去**並不適用於彈窗 (`window.open`)**！根據 WebKit Bugzilla #225559 的開發者實測證明，在過去的 iOS WebKit 中，只要呼叫了 `fetch` 或任何牽涉到網路、甚至讀取 Blob 的非同步 Promise 操作，即使耗時遠低於 1 秒，Token 也會被**立刻沒收**。這代表相對於 `setTimeout` 的 1 秒寬限期，過去的 `fetch` 等 Promise 操作在 iOS 上對於彈窗來說反而更加嚴格，等同於「0 秒寬限」。
   - **【iOS 18 現代 WebKit 放行快速 Fetch】**：在最新世代的 iOS 18.7.10 實測中，WebKit 已優化了短延遲 Promise 的手勢追蹤。只要輕量快速的 `fetch`（在數十毫秒內回應完成），就能成功保留 Transient Activation，使後續的 `window.open`、動態 `<a>` 與 `<form target="_blank">` 順利被原生 `WKUIDelegate` 攔截。但若網路延遲過長，依然會受限於手勢過期。
   - **【薛丁格狀態】iOS 15 以後與 In-App Browser**：Apple 近年大幅強化了隱私權與防彈窗濫用機制 (例如 ITP 相關防護)。在實際場景中 (特別是社群軟體的內建 WebView / In-App Browser，或開啟了進階防護)，Token 的審查變得更加不透明與嚴苛，導致前端開發者覺得彈窗機制「時好時壞」。

3. **表單導航 (`form.submit()`) vs 彈窗 (`window.open()`)**：
   - 表單提交走 WebKit 的 Form Navigation (`FrameLoader::submitForm`)，當設定 `target="_blank"` 時會向原生 `WKUIDelegate.webView(_:createWebViewWith:for:windowFeatures:)` 發起新視窗請求。
   - **iOS 支援 POST `_blank` 攔截**：不論 GET 或 POST，iOS `WKUIDelegate` 皆會觸發攔截彈窗；但須注意因 WebKit IPC 機制限制，`navigationAction.request.httpBody` 在攔截點永遠為 `nil`。

---

### ⚠️ 避坑指南：純前端 `window.open('', '_blank')` 繞過技巧在 Native WebView 中的災難性副作用

在純 Web 開發中，前端工程師常使用一個知名的繞過技巧：「先同步開啟空白視窗 `window.open('', '_blank')`，等非同步請求完成後再修改 `location.href`」(可見於下方 StackOverflow 參考資料)。

然而，**這個技巧在 Native App (In-App Browser / WebView) 開發中往往會引發災難**：
1. 當前端開啟空白視窗時，原生端的 `WKUIDelegate` 或 `WebChromeClient` 會第一時間攔截到一個網址為空 (`""`) 或 `about:blank` 的請求。
2. 這會導致原生端無法依據 URL 進行正確的攔截解析、網域白名單過濾或 Deep Link 路由。
3. 若原生端勉強放行，使用者也會先看到令人困惑的長時間白屏畫面，體驗極差；若原生端因為網址為空而忽略處理，後續即使前端修改了 `location.href`，也無法再次喚起原生跳轉。

因此，由於跨平台雙引擎的生命週期判定機制完全不一致，加上純前端的 workaround 在原生環境水土不服，採用 **JSBridge**（原生完全掌控）或 **伺服器端中繼架構（302 重新導向 / Form Bridge 表單跳轉）**，是唯三能保證雙平台 100% 穩定運作的標準解法。

---

## 5. 參考資料 (References)

### 🍏 iOS / WebKit 官方與標準規範
- 📖 [Apple Developer: WKUIDelegate webView(_:createWebViewWith:for:windowFeatures:)](https://developer.apple.com/documentation/webkit/wkuidelegate/1536907-webview)
- 📖 [Apple Developer: WKPreferences.javaScriptCanOpenWindowsAutomatically](https://developer.apple.com/documentation/webkit/wkpreferences/javascriptcanopenwindowsautomatically)
- 📖 [WebKit Bugzilla #225559: Implement standards-compliant user gesture tracking](https://bugs.webkit.org/show_bug.cgi?id=225559)
- 📖 [WebKit Bugzilla #215014: Move user gesture propagation over promise behind a feature flag](https://bugs.webkit.org/show_bug.cgi?id=215014)
- 📖 [WebKit Bugzilla #140188: WKNavigationAction.request.HTTPBody is nil on form post](https://bugs.webkit.org/show_bug.cgi?id=140188)
- 📖 [GitHub WICG/interventions #12: User gesture required for sensitive operations (WebKit 1s setTimeout grace period discussion)](https://github.com/WICG/interventions/issues/12)
- 📖 [WebKit Commit ebeb545: Propagate user gestures through sendMessage](https://github.com/WebKit/WebKit/commit/ebeb54525a799f353a717f2492acf7066433efbc)
- 📖 [StackOverflow: Safari window.open async workaround (純前端繞過技巧及其在 WebView 的副作用)](https://stackoverflow.com/questions/20696041/window-openurl-blank-not-working-on-imac-safari)

### 🤖 Android / Chromium 官方與原始碼
- 📖 [Android Developer: WebViewClient.shouldOverrideUrlLoading (Note: not called for POST requests)](https://developer.android.com/reference/android/webkit/WebViewClient#shouldOverrideUrlLoading(android.webkit.WebView,%20java.lang.String))
- 📖 [AOSP Source: WebViewClient.java (Official JavaDoc: not called for POST requests)](https://android.googlesource.com/platform/frameworks/base/+/master/core/java/android/webkit/WebViewClient.java)
- 📖 [Android Developer: WebSettings.setJavaScriptCanOpenWindowsAutomatically](https://developer.android.com/reference/android/webkit/WebSettings#setJavaScriptCanOpenWindowsAutomatically(boolean))
- 📖 [Chromium Blog: User Activation v2 (UAv2) Mechanism](https://developer.chrome.com/blog/user-activation)
- 📖 [Chromium Source: user_activation_state.h (kActivationLifespan 5000ms Constant)](https://github.com/chromium/chromium/blob/7115760f2e6dafa470a579182b2709ded743e683/third_party/blink/public/common/frame/user_activation_state.h#L23)
- 📖 [Chromium Source: user_activation_state.cc (Token Refresh Implementation)](https://github.com/chromium/chromium/blob/main/third_party/blink/common/frame/user_activation_state.cc)

### 🌐 Web 標準規範 (W3C / WHATWG / MDN)
- 📖 [MDN Web Docs: Transient Activation](https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation)
- 📖 [MDN Web Docs: UserActivation API (navigator.userActivation)](https://developer.mozilla.org/en-US/docs/Web/API/UserActivation)
- 📖 [WHATWG HTML Standard: Form submission algorithm](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-algorithm)
- 📖 [Mozilla Bugzilla #1469730: window.open popup is blocked from microtask](https://bugzilla.mozilla.org/show_bug.cgi?id=1469730)

---

> [!TIP]
> **想看真實的實機測試結果與錄影？**
> 本專案的 iOS 與 Android 攔截測試錄影，已統一整理於專案首頁的 [README.md](../README.md) 中。