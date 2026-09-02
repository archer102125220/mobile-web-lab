# Mobile Web Lab 🧪📱

Cross-platform Mobile Web & WebView Compatibility, Behavioral Boundaries, and Quirks Benchmark Laboratory.

> **Mission**: Eliminate misunderstandings and unverified assumptions during cross-platform and cross-domain (Web vs. Native) collaboration by providing concrete experimental benchmarks and real-device test results as the single source of truth for technical decisions and architecture design.

[繁體中文版](README.md)

---

## Directory Structure & Modules

This repository adopts a decoupled, flat multi-project architecture where each experimental module operates independently without cross-dependencies:

```text
mobile-web-lab/
├── webview-interceptor/      # [Lab 1] Dual-platform WebView navigation & popup interception
├── ios-safe-area-inset/      # [Lab 2] iOS Mobile Web Safe Area Inset & Viewport test lab
└── navigator-language/       # [Lab 3] Cross-platform language & locale detection (Planned)
```

---

### 🔬 Modules Overview

| Module | Platforms | Core Focus & Verification Goals | Link |
| :--- | :--- | :--- | :--- |
| **`webview-interceptor`** | 🤖 Android<br>🍏 iOS | • In-page navigation (`location.href`, `<a href>`) interception<br>• New window (`window.open`) & popup blocker limits<br>• Microtask/Macrotask async navigation (Event Loop)<br>• SPA route changes (`history.pushState`) blind spots<br>• Form submissions (POST body loss & native penetration bugs)<br>• Server-side delayed redirects (Delayed 302) & Form Bridge | [Go to Module ➔](./webview-interceptor/README_en.md) |
| **`ios-safe-area-inset`** | 🍏 iOS (Safari / PWA) | • `viewport-fit=cover` behavior verification<br>• CSS `env(safe-area-inset-*)` real-time measurement and px conversion<br>• Notch, Dynamic Island, and Home Indicator adaptation<br>• Screen orientation and component layout live visualization | [Go to Module ➔](./ios-safe-area-inset/README.md) |
| **`navigator-language`** *(Planned)* | 🤖 Android<br>🍏 iOS<br>🌐 Web | • System locale vs. Browser app locale vs. WebView locale<br>• `navigator.language` & `navigator.languages` return order<br>• HTTP `Accept-Language` header consistency | In planning |

---

## Quick Start

Each module is self-contained. Navigate to the respective directory to run:

### 1. Run `webview-interceptor`
```bash
# Start Mock Server
cd webview-interceptor/mock-server
node server.js

# Open iOS Project (Xcode)
open webview-interceptor/IOS/WebViewInterceptorDemo.xcodeproj

# Open Android Project (Android Studio)
# Open the webview-interceptor/Android folder
```

### 2. Run `ios-safe-area-inset`
```bash
cd ios-safe-area-inset
node server.js
# The terminal will display the local network URL and a QR code for mobile testing.
```

---

## License

This project is licensed under the [MIT License](LICENSE).
