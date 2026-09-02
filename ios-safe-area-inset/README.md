# iOS Safe Area Inset 測試實驗室 (iOS Safe Area Inset Lab)

這是一個專門用於測試與驗證 iOS 行動裝置（Mobile Safari、PWA、Standalone 模式）在不同螢幕瀏海（Notch）、動態島（Dynamic Island）、Home Indicator 與旋轉方向（Landscape / Portrait）下，**CSS `env(safe-area-inset-*)` 與 `viewport-fit` 行為** 的互動式測試環境。

---

## 測試目標與特色

1. **即時 Safe Area 數值測量**：透過 CSS `env()` 探針即時換算並顯示 `Top`、`Bottom`、`Left`、`Right` 的精確像素 (px) 數值。
2. **Viewport-fit 切換**：支援即時切換 `viewport-fit=cover` 與 `viewport-fit=auto/contain`，觀察安全區域邊界的變化。
3. **邊界可視化覆蓋層**：高對比色塊視覺化展示目前安全區域與危險區域的交界。
4. **互動組件展示**：模擬常見的 Fixed Header、Bottom Floating Bar、滿版圖片卡片在開啟與關閉 Safe Area 調整時的排版差異。
5. **內建 QR Code 快速分享**：啟動本地伺服器後，終端機與頁面皆會顯示局域網 QR Code，方便用實體 iPhone / iPad 掃描即時測試。

---

## 快速啟動

專案使用純 Node.js 內建模組，無任何額外外部套件依賴。

```bash
# 1. 進入目錄
cd ios-safe-area-inset

# 2. 啟動伺服器
node server.js
# 或使用 Yarn / NPM
yarn start
```

啟動後：
* 本地訪問：`http://localhost:3000`
* 區域網路訪問：終端機將輸出區域網路 IP 與 QR Code，可直接使用手機相機掃描開啟。
