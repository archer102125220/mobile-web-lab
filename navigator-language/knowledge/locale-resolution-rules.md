# 跨平台語系決定機制與行為邊界深度解析 (Locale Resolution Deep Dive)

在現代 Web 與行動裝置 (iOS / Android / Mobile Browsers) 的跨平台開發中，語系 (Locale) 往往是極易產生「認知落差 (Cognitive Bias)」與「邊界地雷」的領域。本文檔深入整理各平台在決定 `navigator.language`、`navigator.languages` 與 HTTP `Accept-Language` 時的底層機制與歷史脈絡。

---

## 1. 核心名詞與標準定義

- **BCP 47 (IETF Best Current Practice 47)**:
  - 定義語言標籤的國際標準結構：`language-extlang-script-region-variant-extension-privateuse`。
  - 例如：`zh-TW` (中文-台灣)、`zh-Hant-TW` (中文-繁體-台灣)、`en-US` (英文-美國)、`ja-JP` (日文-日本)。
- **`navigator.language`**:
  - 回傳目前使用者首選語言的 BCP 47 標籤字串（例如 `"zh-TW"`）。
- **`navigator.languages`**:
  - 回傳只讀的字串陣列（Frozen Array），代表使用者偏好語言的降冪優先順序（例如 `["zh-TW", "zh", "en-US", "en"]`）。
- **HTTP `Accept-Language` 標頭 (RFC 9110 / RFC 4647)**:
  - 瀏覽器在發送 HTTP 請求時帶上的語言偏好與品質因子 (q-factor)，例如：`zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7`。

---

## 2. 雙平台 Native 與 WebView 語系行為比對

| 維度 / 平台 | 🍏 iOS (WebKit / Safari / WKWebView) | 🤖 Android (Chromium / Chrome / WebView) |
| :--- | :--- | :--- |
| **原生語言列表 API** | `Locale.preferredLanguages` | `LocaleList.getDefault()` (API 24+) / `Locale.getDefault()` |
| **App 獨立語言支援** | iOS 13+「設定 > 該 App > 偏好語言」 | Android 13+「設定 > 應用程式 > 語言」或 `LocaleManager` |
| **WKWebView / WebView 繼承** | WKWebView 會自動繼承 App 獨立偏好語言 | Android WebView 預設跟隨系統 `LocaleList`，除非 App 手動設定 `Configuration.setLocales()` |
| **`navigator.languages` 回傳長度** | 總是回傳完整的使用者語言優先順序清單 | 現代 Android WebView 會回傳清單；但早期舊版曾有僅回傳長度 1 (`[navigator.language]`) 的缺陷 |
| **HTTP `Accept-Language` 產生源** | WebKit 網路層依照 `Locale.preferredLanguages` 自動構建 q-factor | Chromium 網路棧自動發送，格式通常自動帶入語系及其基底語言 (Base Language) |

---

## 3. 跨平台常見地雷與最佳實踐 (Best Practices)

### 陷阱 1：伺服器端錯誤解析 `Accept-Language`
> **錯誤寫法**：
> ```javascript
> const lang = req.headers['accept-language'].split(',')[0]; // ❌ 致命錯誤！
> ```
> **原因**：`Accept-Language` 中的項目不一定依照順序排列，且可能帶有 `q=0.5` 等品質加權。若第一個項目被標記為 `q=0.1`，直接取第一個將會得到錯誤的最低優先語系。
>
> **正確寫法**：
> 必須完整拆解每一項的 `q` 值，並依 `q` 由大至小降冪排序後再進行匹配。

### 陷阱 2：大小寫敏感度 (Case Sensitivity) 假定
> **現況**：BCP 47 標準對大小寫是不敏感的（Case-insensitive），例如 `zh-TW`、`zh-tw`、`ZH-TW` 在規範上皆合法。
> **防禦手段**：在進行字典比對或語系協商時，務必將雙方轉為 `.toLowerCase()` 進行比較。

### 陷阱 3：地區代碼省略與基底匹配 (Base Language Fallback)
> **場景**：使用者偏好為 `zh-TW`，但網站僅提供 `zh` (通用中文) 或 `en`。
> **解法 (RFC 4647)**：
> 實作 Lookup 演算法時，應採用層級降階：
> 1. 精確比對：`zh-TW`
> 2. 前綴/基底比對：`zh`
> 3. 預設退回：`en`

### 陷阱 4：iOS 13+ App 獨立語系切換後的 WebView 重整
> 當使用者在 iOS 系統設定中切換了該 App 的獨立語系，回到 App 時，`Locale.preferredLanguages` 會立即更新。WKWebView 在重新載入（`webView.reload()`）後，`navigator.language` 也會同步更新為新選擇的語系。
