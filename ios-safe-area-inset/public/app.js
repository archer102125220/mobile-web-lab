/**
 * iOS Safe Area Inset 測試互動邏輯
 */

(function () {
  "use strict";

  // DOM 節點引用
  const probeTop = document.getElementById("probe-top");
  const probeRight = document.getElementById("probe-right");
  const probeBottom = document.getElementById("probe-bottom");
  const probeLeft = document.getElementById("probe-left");

  const valTop = document.getElementById("val-top");
  const valRight = document.getElementById("val-right");
  const valBottom = document.getElementById("val-bottom");
  const valLeft = document.getElementById("val-left");

  const overlayTopVal = document.getElementById("overlay-top-val");
  const overlayRightVal = document.getElementById("overlay-right-val");
  const overlayBottomVal = document.getElementById("overlay-bottom-val");
  const overlayLeftVal = document.getElementById("overlay-left-val");

  const landscapeLeftVal = document.getElementById("landscape-left-val");
  const landscapeRightVal = document.getElementById("landscape-right-val");

  const screenOrientationIcon = document.getElementById(
    "screen-orientation-icon",
  );
  const screenOrientationText = document.getElementById(
    "screen-orientation-text",
  );

  const infoEnv = document.getElementById("info-env");
  const infoScreen = document.getElementById("info-screen");
  const infoInner = document.getElementById("info-inner");
  const infoVisualVp = document.getElementById("info-visual-vp");
  const infoDpr = document.getElementById("info-dpr");
  const infoStandalone = document.getElementById("info-standalone");
  const infoUa = document.getElementById("info-ua");

  const viewportMeta = document.getElementById("viewport-meta");
  const btnToggleFit = document.getElementById("btn-toggle-fit");
  const labelViewportFit = document.getElementById("label-viewport-fit");

  const btnFitCover = document.getElementById("btn-fit-cover");
  const btnFitContain = document.getElementById("btn-fit-contain");
  const btnFitAuto = document.getElementById("btn-fit-auto");

  const edgeOverlays = document.getElementById("edge-overlays");
  const btnToggleOverlay = document.getElementById("btn-toggle-overlay");

  const selectSimulator = document.getElementById("select-simulator");
  const btnToggleSafeCss = document.getElementById("btn-toggle-safe-css");

  // =========================================================================
  // 1. Safe Area Inset 即時量測計算
  // =========================================================================
  function updateInsets() {
    let top = 0;
    let right = 0;
    let bottom = 0;
    let left = 0;

    // 檢查是否有模擬器模式生效
    const bodyClass = document.body.className;
    if (bodyClass.includes("sim-iphone-island")) {
      top = 59;
      right = 0;
      bottom = 34;
      left = 0;
    } else if (bodyClass.includes("sim-iphone-notch")) {
      top = 47;
      right = 0;
      bottom = 34;
      left = 0;
    } else if (bodyClass.includes("sim-ipad-pro")) {
      top = 24;
      right = 0;
      bottom = 20;
      left = 0;
    } else if (bodyClass.includes("sim-landscape-notch")) {
      top = 0;
      right = 47;
      bottom = 21;
      left = 47;
    } else if (bodyClass.includes("safe-area-disabled")) {
      top = 0;
      right = 0;
      bottom = 0;
      left = 0;
    } else {
      // 透過隱藏 probe 元素獲取原生 computed style 尺寸 (單位為 px)
      if (probeTop && probeRight && probeBottom && probeLeft) {
        const csTop = window.getComputedStyle(probeTop);
        const csRight = window.getComputedStyle(probeRight);
        const csBottom = window.getComputedStyle(probeBottom);
        const csLeft = window.getComputedStyle(probeLeft);

        top = parseFloat(csTop.height) || 0;
        right = parseFloat(csRight.width) || 0;
        bottom = parseFloat(csBottom.height) || 0;
        left = parseFloat(csLeft.width) || 0;
      }
    }

    const formatVal = (v) => `${Math.round(v)}<small>px</small>`;
    const formatPx = (v) => `${Math.round(v)}px`;

    // 更新十字儀表板數值
    if (valTop) valTop.innerHTML = formatVal(top);
    if (valRight) valRight.innerHTML = formatVal(right);
    if (valBottom) valBottom.innerHTML = formatVal(bottom);
    if (valLeft) valLeft.innerHTML = formatVal(left);

    // 更新覆蓋尺標標籤
    if (overlayTopVal) overlayTopVal.textContent = formatPx(top);
    if (overlayRightVal) overlayRightVal.textContent = formatPx(right);
    if (overlayBottomVal) overlayBottomVal.textContent = formatPx(bottom);
    if (overlayLeftVal) overlayLeftVal.textContent = formatPx(left);

    // 更新橫向測試標籤
    if (landscapeLeftVal) landscapeLeftVal.textContent = formatPx(left);
    if (landscapeRightVal) landscapeRightVal.textContent = formatPx(right);

    // 更新螢幕方向判斷
    const isLandscape = window.innerWidth > window.innerHeight;
    if (screenOrientationIcon && screenOrientationText) {
      screenOrientationIcon.textContent = isLandscape ? "📱🔄" : "📱";
      screenOrientationText.textContent = isLandscape
        ? "Landscape (橫向)"
        : "Portrait (直向)";
    }

    // 更新環境資訊表
    updateEnvironmentInfo();
  }

  // =========================================================================
  // 2. 裝置與 Viewport 資訊檢測
  // =========================================================================
  function updateEnvironmentInfo() {
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    if (infoEnv) {
      if (isIOS) {
        infoEnv.innerHTML = `<span style="color:#34c759;font-weight:600">📱 iOS 裝置 (${isStandalone ? "PWA 全螢幕模式" : "Safari 瀏覽器"})</span>`;
      } else {
        infoEnv.innerHTML = `<span style="color:#38bdf8">💻 桌上型/非 iOS 瀏覽器</span>`;
      }
    }

    if (infoScreen) {
      infoScreen.textContent = `${window.screen.width} × ${window.screen.height} (色彩深度: ${window.screen.colorDepth}-bit)`;
    }

    if (infoInner) {
      infoInner.textContent = `${window.innerWidth} × ${window.innerHeight} px`;
    }

    if (infoVisualVp && window.visualViewport) {
      const vv = window.visualViewport;
      infoVisualVp.textContent = `${Math.round(vv.width)} × ${Math.round(vv.height)} (縮放比: ${vv.scale.toFixed(2)}, offsetTop: ${Math.round(vv.offsetTop)})`;
    } else if (infoVisualVp) {
      infoVisualVp.textContent = "不支援 visualViewport API";
    }

    if (infoDpr) {
      infoDpr.textContent = `${window.devicePixelRatio}x`;
    }

    if (infoStandalone) {
      infoStandalone.textContent = isStandalone
        ? "✅ 是 (Standalone App)"
        : "❌ 否 (一般瀏覽器頁面)";
    }

    if (infoUa) {
      infoUa.textContent = navigator.userAgent;
    }
  }

  // =========================================================================
  // 3. Viewport-fit 動態切換控制
  // =========================================================================
  function setViewportFit(fitValue) {
    if (!viewportMeta) return;

    let content =
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    if (fitValue) {
      content += `, viewport-fit=${fitValue}`;
    }
    viewportMeta.setAttribute("content", content);

    if (labelViewportFit) {
      labelViewportFit.textContent = `viewport-fit=${fitValue || "auto"}`;
    }

    // 更新按鈕樣式
    [btnFitCover, btnFitContain, btnFitAuto].forEach((btn) => {
      if (!btn) return;
      btn.className = "btn btn-sm btn-outline";
    });

    if (fitValue === "cover" && btnFitCover)
      btnFitCover.className = "btn btn-sm btn-primary";
    if (fitValue === "contain" && btnFitContain)
      btnFitContain.className = "btn btn-sm btn-primary";
    if ((fitValue === "auto" || !fitValue) && btnFitAuto)
      btnFitAuto.className = "btn btn-sm btn-primary";

    setTimeout(updateInsets, 100);
  }

  if (btnFitCover)
    btnFitCover.addEventListener("click", () => setViewportFit("cover"));
  if (btnFitContain)
    btnFitContain.addEventListener("click", () => setViewportFit("contain"));
  if (btnFitAuto)
    btnFitAuto.addEventListener("click", () => setViewportFit("auto"));

  if (btnToggleFit) {
    btnToggleFit.addEventListener("click", () => {
      const current = viewportMeta.getAttribute("content");
      if (current.includes("viewport-fit=cover")) {
        setViewportFit("contain");
      } else if (current.includes("viewport-fit=contain")) {
        setViewportFit("auto");
      } else {
        setViewportFit("cover");
      }
    });
  }

  // =========================================================================
  // 4. 邊界尺標與模擬器模式切換
  // =========================================================================
  if (btnToggleOverlay) {
    btnToggleOverlay.addEventListener("click", () => {
      const isActive = edgeOverlays.classList.toggle("active");
      btnToggleOverlay.textContent = `切換顯示尺標 (${isActive ? "ON" : "OFF"})`;
      btnToggleOverlay.className = isActive
        ? "btn btn-sm btn-accent"
        : "btn btn-sm btn-outline";
    });
  }

  if (selectSimulator) {
    selectSimulator.addEventListener("change", (e) => {
      const val = e.target.value;
      // 清除所有模擬 class
      document.body.classList.remove(
        "sim-iphone-island",
        "sim-iphone-notch",
        "sim-ipad-pro",
        "sim-landscape-notch",
      );
      if (val !== "none") {
        document.body.classList.add(`sim-${val}`);
      }
      updateInsets();
    });
  }

  if (btnToggleSafeCss) {
    btnToggleSafeCss.addEventListener("click", () => {
      const isDisabled = document.body.classList.toggle("safe-area-disabled");
      btnToggleSafeCss.textContent = isDisabled
        ? "切換 CSS Safe Area (已關閉-體驗遮擋)"
        : "切換 CSS Safe Area (已啟用)";
      btnToggleSafeCss.className = isDisabled
        ? "btn btn-sm btn-outline"
        : "btn btn-sm btn-warning";
      updateInsets();
    });
  }

  // =========================================================================
  // 5. 分頁 Tab 切換邏輯
  // =========================================================================
  const navTabs = document.querySelectorAll(".nav-tab");
  const tabPanels = document.querySelectorAll(".tab-panel");

  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = `tab-${tab.getAttribute("data-tab")}`;

      navTabs.forEach((t) => t.classList.remove("active"));
      tabPanels.forEach((p) => p.classList.remove("active"));

      tab.classList.add("active");
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }

      // 如果切換到連線頁面，觸發載入伺服器 IP
      if (tab.getAttribute("data-tab") === "connect") {
        fetchServerInfo();
      }
    });
  });

  // =========================================================================
  // 6. 互動元件：Action Sheet & Toast & FAB
  // =========================================================================
  const btnTriggerToast = document.getElementById("btn-trigger-toast");
  const demoToast = document.getElementById("demo-toast");
  const btnTriggerActionSheet = document.getElementById(
    "btn-trigger-actionsheet",
  );
  const actionSheetBackdrop = document.getElementById(
    "demo-actionsheet-backdrop",
  );
  const btnCloseActionSheet = document.getElementById("btn-close-actionsheet");
  const demoFab = document.getElementById("demo-fab");

  let toastTimer = null;
  function showToast(msg) {
    if (demoToast) {
      if (msg) demoToast.querySelector("span").textContent = msg;
      demoToast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        demoToast.classList.remove("show");
      }, 3000);
    }
  }

  if (btnTriggerToast) {
    btnTriggerToast.addEventListener("click", () => {
      showToast("✅ Toast 通知：已套用底部 Safe Area 邊距！");
    });
  }

  if (demoFab) {
    demoFab.addEventListener("click", () => {
      showToast("🚀 FAB 點擊成功！位置精確避開 Home Bar 與 TabBar。");
    });
  }

  if (btnTriggerActionSheet && actionSheetBackdrop) {
    btnTriggerActionSheet.addEventListener("click", () => {
      actionSheetBackdrop.classList.add("active");
    });

    if (btnCloseActionSheet) {
      btnCloseActionSheet.addEventListener("click", () => {
        actionSheetBackdrop.classList.remove("active");
      });
    }

    actionSheetBackdrop.addEventListener("click", (e) => {
      if (e.target === actionSheetBackdrop) {
        actionSheetBackdrop.classList.remove("active");
      }
    });
  }

  // =========================================================================
  // 7. 輕量級 QR Code 產生器 (純前端 SVG 繪製，支援完全離線)
  // =========================================================================
  function generateQRCodeSVG(text) {
    try {
      if (typeof window.qrcode === "function") {
        const qr = window.qrcode(0, "M");
        qr.addData(text);
        qr.make();
        return qr.createSvgTag(5, 2);
      }
    } catch (e) {
      console.warn("離線 QRCode 生成異常，切換至備用渲染:", e);
    }
    const encoded = encodeURIComponent(text);
    return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}" alt="QR Code" style="width:200px;height:200px;display:block;" onerror="this.onerror=null;this.parentElement.innerHTML='<div style=\\'padding:20px;text-align:center;font-size:12px;color:#333;\\'>請直接手動輸入網址:<br><b>${text}</b></div>';" />`;
  }

  async function fetchServerInfo() {
    const urlsContainer = document.getElementById("connect-urls-list");
    const qrContainer = document.getElementById("qrcode-container");
    if (!urlsContainer || !qrContainer) return;

    try {
      const res = await fetch("/api/info");
      const data = await res.json();

      let primaryUrl = `http://${window.location.hostname}:${data.port || 3000}`;
      let html = "";

      if (data.lanIps && data.lanIps.length > 0) {
        primaryUrl = `http://${data.lanIps[0].address}:${data.port}`;
        data.lanIps.forEach((ip) => {
          const fullUrl = `http://${ip.address}:${data.port}`;
          html += `
            <div class="url-card">
              <div>
                <div class="url-card-name">區域網路 (${ip.name})</div>
                <a href="${fullUrl}" target="_blank" class="url-card-link">${fullUrl}</a>
              </div>
              <button class="btn btn-sm btn-outline" onclick="navigator.clipboard.writeText('${fullUrl}').then(()=>alert('已複製網址：${fullUrl}'))">複製</button>
            </div>
          `;
        });
      } else {
        html = `
          <div class="url-card">
            <div>
              <div class="url-card-name">本機端</div>
              <a href="http://localhost:${data.port}" class="url-card-link">http://localhost:${data.port}</a>
            </div>
          </div>
        `;
      }

      urlsContainer.innerHTML = html;
      qrContainer.innerHTML = generateQRCodeSVG(primaryUrl);
    } catch (err) {
      console.warn("無法獲取伺服器網路資訊:", err);
      const fallbackUrl = window.location.href;
      urlsContainer.innerHTML = `<div class="url-card"><a href="${fallbackUrl}" class="url-card-link">${fallbackUrl}</a></div>`;
      qrContainer.innerHTML = generateQRCodeSVG(fallbackUrl);
    }
  }

  // =========================================================================
  // 8. 全域事件監聽 (視窗旋轉、尺寸變更、鍵盤彈出)
  // =========================================================================
  window.addEventListener("resize", updateInsets);
  window.addEventListener("orientationchange", () => {
    setTimeout(updateInsets, 200);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateInsets);
    window.visualViewport.addEventListener("scroll", updateInsets);
  }

  // 初次執行
  updateInsets();
  fetchServerInfo();
})();
