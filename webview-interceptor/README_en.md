# WebView Interceptor Demo

[中文版](README.md)

This is a dual-platform (Android / iOS) WebView redirection interception testing and demonstration project.
The purpose of this project is to deeply test and verify the limits and blind spots of native interceptors in WebViews under various scenarios (such as manual clicks, script redirections, asynchronous tasks, SPA routing, and form navigation).

The establishment of this project stems from the common cognitive gaps during cross-domain collaboration. Many WebView behaviors that are basic common sense in the frontend field are often difficult to convince engineers from non-frontend fields simply through verbal explanation. To prevent technical discussions from devolving into subjective impressions like "that's just your imagination," this project provides a concrete experimental benchmark. It uses the most authentic dual-platform running results as the sole basis for technical verification.

---

## 📱 Benchmark Environment
* 🍏 **iOS**: iPhone Xs, System Version **iOS 18.7.10**
* 🤖 **Android**: Samsung Galaxy Z Fold5, System Version **One UI 8.5 (Android 16)**

---

## Project Structure
* **`Android/`**: Android version, using Kotlin with modern `WebViewClient` (handles in-page redirection) and `WebChromeClient` (handles new windows).
* **`IOS/`**: iOS version, using Swift with `WKWebView`, `WKNavigationDelegate` (handles in-page redirection), and `WKUIDelegate` (handles new windows).

---

## Test Scenarios Covered

1. **Basic Redirection Interception**: `<a href="...">`, `location.href`, `window.open`.
2. **Asynchronous Script Triggered (Event Loop Testing)**: Redirections triggered via `Promise.resolve().then` (Microtask) and `setTimeout` (Macrotask).
3. **Interception Blind Spots / Failure & Platform Difference Testing**:
    * **SPA Routing Switch (`history.pushState`)**: Interception fails on both platforms (pure frontend URL change without reload or navigation actions).
    * **Form Redirection (`<form>`)**:
      * **Top-level Navigation (`target="_self"`)**: Behaves like standard `location.href` navigation and is not affected by popup blockers. However, note **POST requests**: Android native `shouldOverrideUrlLoading` by spec never intercepts POST (penetrates directly into the internal WebView); iOS `WKNavigationDelegate` intercepts them, but the `httpBody` is always `nil` due to cross-process (IPC) limitations.
      * **Opening a New Window (`target="_blank"`)**: Follows Web Form Navigation lifecycle. Synchronous, Microtask, and fast Fetch submissions pass on both platforms; however, 1s Macrotask delay fails on iOS due to gesture expiration (allowed on Android under UAv2 5s grace period); POST `_blank` is successfully intercepted on iOS `WKUIDelegate`, while on Android it remains completely silent in temporary windows because `shouldOverrideUrlLoading` omits POST.
    * **Asynchronous Popups (`fetch` / `setTimeout` + `window.open`)**: Android Chromium allows execution within its 5-second UAv2 grace period; iOS 18.7.10 modern WebKit preserves gesture activation for fast, lightweight `fetch` calls, but strictly blocks 1-second+ Macrotask delays like `setTimeout(1000)`.
4. **Server-side Delayed 302 Redirect**:
    * Tests opening a new window (`_blank`) directly using an `a tag` or `window.open`, pointing to an API that intentionally delays for 2 seconds on the server side (simulating an async database query) before returning an HTTP 302 redirect.
    * **Result**: Works perfectly on both platforms! This proves that as long as the asynchronous waiting process is shifted to the server side, it can perfectly bypass the strict popup security restrictions imposed by WebViews on JS async callbacks.
5. **Server-side Form Bridge (GET & POST)**:
    * Tests opening an intermediary server page in a new tab (`target="_blank"`), where the intermediary page directly triggers an API call in `<script>` upon load to fetch the destination URL and parameters, and then submits a Web Form (GET / POST) to navigate to the result page.
    * **Result**: Because the new tab is opened synchronously on user click, subsequent form navigation happens within the new page's own lifecycle and successfully forwards GET and POST parameters.

---

## 📊 Dual-Platform Full Benchmark Matrix

| Category | Test Item (1 ~ 53) | Android 16 (Fold5) | iOS 18.7.10 (iPhone Xs) | Core Mechanism & Notes |
| :--- | :--- | :---: | :---: | :--- |
| **🚀 Advanced Experiments** | WebServer 302 Redirect & Form Bridge (incl. 6s delay) | 🟢 Intercepted & Allowed | 🟢 Intercepted & Allowed | Server-side async shift avoids client gesture loss |
| **🟢 Both Platforms Succeed** | 1. a tag in-page navigation | 🟢 Intercepted | 🟢 Intercepted | Physical click top-level navigation |
| | 2. a tag new window (`target="_blank"`) | 🟢 Intercepted | 🟢 Intercepted | Physical click new window navigation |
| | 3. Dynamic a tag creation and click (sync) | 🟢 Intercepted | 🟢 Intercepted | Synchronous user gesture inheritance |
| | 4. `location.href` in-page navigation | 🟢 Intercepted | 🟢 Intercepted | Script top-level navigation |
| | 5. `window.open` in-page (`_self`) | 🟢 Intercepted | 🟢 Intercepted | Script top-level navigation |
| | 6. `window.open` new window (`_blank`) | 🟢 Intercepted | 🟢 Intercepted | Synchronous popup token valid |
| | 7. Microtask (Promise) -> `location.href` | 🟢 Intercepted | 🟢 Intercepted | In-page navigation has no popup restrictions |
| | 8. Macrotask (setTimeout 1s) -> `location.href`| 🟢 Intercepted | 🟢 Intercepted | In-page navigation has no popup restrictions |
| | 9. Fetch API -> `location.href` | 🟢 Intercepted | 🟢 Intercepted | In-page navigation has no popup restrictions |
| | 10. Fetch API -> `window.open` (`_self`) | 🟢 Intercepted | 🟢 Intercepted | In-page navigation has no popup restrictions |
| | 11. Fetch API -> `window.open` (`_blank`) | 🟢 Intercepted | 🟢 Intercepted | Android 5s grace period; iOS 18 fast Fetch gesture retained |
| | 12. Fetch API -> dynamic a tag (`_blank`) | 🟢 Intercepted | 🟢 Intercepted | Same as item 11 |
| | 13. HTML static form GET `_blank` (sync click) | 🟢 Intercepted | 🟢 Intercepted | Form navigation + sync gesture |
| | 14. JS trigger static form GET `_blank` (sync) | 🟢 Intercepted | 🟢 Intercepted | Form navigation + sync gesture |
| | 15. JS trigger static form GET `_blank` (Microtask) | 🟢 Intercepted | 🟢 Intercepted | Microtask preserves user gesture |
| | 16. JS trigger static form GET `_blank` (after Fetch) | 🟢 Intercepted | 🟢 Intercepted | Fast Fetch allows form navigation |
| | 17. Dynamic form GET `_blank` (sync) | 🟢 Intercepted | 🟢 Intercepted | Dynamic form with sync gesture |
| | 18. Dynamic form GET `_blank` (Microtask) | 🟢 Intercepted | 🟢 Intercepted | Microtask preserves user gesture |
| | 19. Dynamic form GET `_blank` (after Fetch) | 🟢 Intercepted | 🟢 Intercepted | Fast Fetch allows form navigation |
| **🟡 Platform Differences & Quirks** | 20~30. Form POST in-page navigation (sync/micro/1s/fetch/6s/dynamic) | 🟡 Direct Penetration | 🟢 Intercepted (Body is nil) | Android ignores POST in `shouldOverrideUrlLoading`; iOS WKNavigationDelegate intercepts but Body is nil |
| | 31. JS trigger static form GET `_blank` (Macrotask 1s) | 🟢 Intercepted | 🔴 Silent / No Response | Android benefits from UAv2 5s; iOS 1s Macrotask gesture expired |
| | 32. Dynamic form GET `_blank` (Macrotask 1s) | 🟢 Intercepted | 🔴 Silent / No Response | Same as item 31 |
| | 33~39. Form POST `_blank` (sync/micro/fetch/dynamic) | 🔴 Silent / No Response | 🟢 Intercepted (Body is nil) | Android never calls `shouldOverrideUrlLoading` for POST; iOS WKUIDelegate intercepts |
| **🔴 Both Platforms Fail** | 40. SPA routing switch (`history.pushState`) | 🔴 No Native Notice | 🔴 No Native Notice | Pure URL state update without document reload |
| | 41. Delayed 6s `window.open` (`_blank`) | 🔴 Popup Blocked | 🔴 Popup Blocked | Exceeds gesture lifespan on both (Android 5s / iOS 1s) |
| | 42. Delayed 6s dynamic a tag (`_blank`) | 🔴 Silent / No Response | 🔴 Silent / No Response | Exceeds gesture lifespan on both |
| | 43. JS trigger static form GET `_blank` (Macrotask 6s) | 🔴 Silent / No Response | 🔴 Silent / No Response | 6s timeout blocks both |
| | 44. Dynamic form GET `_blank` (Macrotask 6s) | 🔴 Silent / No Response | 🔴 Silent / No Response | 6s timeout blocks both |
| | 45. JS trigger static form POST `_blank` (Macrotask 1s) | 🔴 Silent / No Response | 🔴 Silent / No Response | iOS Macrotask timeout; Android omits POST |
| | 46. JS trigger static form POST `_blank` (Macrotask 6s) | 🔴 Silent / No Response | 🔴 Silent / No Response | 6s timeout blocks both |
| | 47. Dynamic form POST `_blank` (Macrotask 1s) | 🔴 Silent / No Response | 🔴 Silent / No Response | iOS Macrotask timeout; Android omits POST |
| | 48. Dynamic form POST `_blank` (Macrotask 6s) | 🔴 Silent / No Response | 🔴 Silent / No Response | 6s timeout blocks both |
| **🟣 JSBridge Native Communication** | 49~53. JSBridge (sync/micro/1s/6s/fetch) | 🟣 100% Success | 🟣 100% Success | Direct Native API invocation, 100% immune to Web popup rules |
| **Custom Interceptions** | Custom Scheme (`myapp://`) & YouTube External App | 🟢 Intercepted | 🟢 Intercepted | Native URL scheme and external app handover |

---

## How to Run and Test

### 🍏 iOS Testing Method

**[Testing on Simulator] (Recommended, Easiest)**
1. Open `IOS/WebViewInterceptorDemo.xcodeproj` using Xcode.
2. In the device menu at the top center of Xcode, select any **iOS Simulator** (e.g., iPhone 15 Pro).
3. Click the **▶️ (Run)** button at the top left to start testing.
> *Simulators do not require developer certificates (Code Signing), ready to test immediately!*

**[Testing on Physical iPhone]**
1. Connect the iPhone to the computer.
2. Click the blue project icon `WebViewInterceptorDemo` in the left navigation bar of Xcode.
3. Switch to the **Signing & Capabilities** tab in the center view.
4. Check **Automatically manage signing**.
5. In the **Team** menu, select **Add an Account...** and log in with your regular Apple ID.
6. Select the Personal Team you just added. If the `Bundle Identifier` reports an error, add some random numbers at the end to make it unique.
7. Click **▶️ (Run)** to install the App on the phone.
8. **Trust Developer**: Before opening the App for the first time, go to the phone's `Settings -> General -> VPN & Device Management`, click on your Apple ID and select "Trust" to open the App successfully!

---

### 🤖 Android Testing Method

**[Testing on Simulator / Physical Device]**
1. **Using Android Studio**:
   * Open Android Studio, select `Open` and import the `Android/` folder.
   * Wait for Gradle synchronization to complete, connect the phone to the computer, and turn on "USB Debugging mode" (or start the Android simulator).
   * Click the **▶️ (Run)** button at the top to install and execute.

2. **Quick Installation using Terminal (CLI)**:
   * Make sure you have connected the physical phone or opened the simulator (`adb devices` to see devices).
   * Enter the Android folder in the terminal and execute the compilation and installation:
     ```bash
     cd Android
     ./gradlew installDebug
     ```
   * After completion, find and open the `WebViewInterceptorDemo` App on the phone or simulator.

---

### 🚀 Advanced Experiment: WebServer 302 Redirect & Form Bridge Tests

To practically test the 4th and 5th scenarios mentioned above, a lightweight Node.js server is built into this project.

1. Ensure [Node.js](https://nodejs.org/) is installed on your computer.
2. Open a terminal and enter the project's `mock-server/` folder.
3. Run `node server.js` to start the server.
4. **Auto-Configuration**: When the server starts, it will automatically detect your current local area network IP and write it into the configuration files for Android (`env.properties`) and iOS (`ServerConfig.swift`).
5. Keep the server running, recompile, and launch the Android or iOS App. The App will automatically read this IP, and you will see a dedicated **Advanced Experiments section** at the top of the home page, containing 302 redirect, Form (GET/POST) bridge navigation, and 6-second timeout tests; click to test the effects.

---

### Test Result Recordings

#### 1. iOS Test Results (Test Device: iPhone Xs, iOS 18.7.10)
![iOS Interception Test Results](./test-result/ios-webview-interceptor-test.gif)

#### 2. Android Test Results (Test Device: Samsung Galaxy Z Fold5, Android 16 / One UI 8.5)
![Android Interception Test Results](./test-result/android-webview-interceptor-test.gif)

---

## Developer Notes: Historical Trivia and Architecture Documents
The source code in the project comes with very detailed "historical comments", recording the painful history of the early Android `shouldOverrideUrlLoading` failing to intercept script redirections, and the pitfall of early iOS `UIWebView` feigning death without responding to `window.open`. It is very suitable for developers who want to deeply understand the underlying evolution of WebView.

Besides this, the project also organizes advanced architecture knowledge:
* 📖 [Cross-Platform WebView Asynchronous Popup Defense Mechanisms and JSBridge Architecture](knowledge/async_popup_blocker_history_en.md): Details why asynchronous `window.open` in Vue/React is blocked by native Apps, **deeply exploring the underlying mechanisms of the Event Loop (Microtask / Macrotask) and the differences between dual-platform engines**, as well as standard JSBridge solutions.
* 📖 [iOS WebView Strictness Analysis: From WebKit Policies to Third-Party App Restrictions](knowledge/ios_webview_strictness_and_in_app_browsers_en.md): Focuses on the pitfalls in real iOS online environments, analyzing **ITP privacy anti-tracking blocks, conservative native configurations**, and extreme blocking situations and version lifecycles in In-App Browsers like LINE and Facebook.
* 📖 [Android WebView Fragmentation Analysis: Impact of Chromium Core and Third-Party Kernels](knowledge/android_webview_fragmentation_en.md): Explores why it behaves consistently on most Android phones equipped with GMS, but still fails on WeChat (X5 kernel) or devices without Google services.
