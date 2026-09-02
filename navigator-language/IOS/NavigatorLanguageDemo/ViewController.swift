import UIKit
import WebKit

class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    var webView: WKWebView!
    var errorView: UIView?

    override func viewDidLoad() {
        super.viewDidLoad()
        self.view.backgroundColor = UIColor(red: 7/255, green: 9/255, blue: 14/255, alpha: 1.0)

        setupWebView()
        loadWebServerUrl()
    }

    private func setupWebView() {
        let config = WKWebViewConfiguration()
        let contentController = WKUserContentController()
        
        // 註冊 NativeBridge 處理來自 Web 端之訊息
        contentController.add(self, name: "NativeBridge")
        config.userContentController = contentController

        webView = WKWebView(frame: self.view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = UIColor.clear
        webView.scrollView.backgroundColor = UIColor.clear

        self.view.addSubview(webView)
    }

    private func loadWebServerUrl() {
        hideErrorView()

        let urlString = SERVER_BASE_URL
        guard let url = URL(string: urlString) else {
            showErrorView(message: "無效的伺服器網址: \(urlString)")
            return
        }

        let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 5.0)
        webView.load(request)
    }

    // 收集 iOS 原生語系與 Locale 資訊
    private func getNativeLocalePayload() -> [String: Any] {
        let systemLocale = Locale.current.identifier
        let preferredLangs = Locale.preferredLanguages
        let bundlePreferred = Bundle.main.preferredLocalizations
        let timeZone = TimeZone.current.identifier
        let osVersion = UIDevice.current.systemVersion
        let model = UIDevice.current.model

        return [
            "platform": "iOS WKWebView (Native)",
            "systemLocale": systemLocale,
            "preferredLanguages": preferredLangs,
            "bundlePreferredLocalizations": bundlePreferred,
            "timezone": timeZone,
            "osVersion": "iOS \(osVersion)",
            "deviceModel": model
        ]
    }

    // 發送 Native 語系資料給 Web 端 (透過 JavaScript 呼叫 window.onNativeLocaleReceived)
    private func sendNativeLocaleToWeb() {
        let payload = getNativeLocalePayload()
        guard let jsonData = try? JSONSerialization.data(withJSONObject: payload, options: []),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            return
        }

        let js = "if (window.onNativeLocaleReceived) { window.onNativeLocaleReceived(\(jsonString)); }"
        DispatchQueue.main.async {
            self.webView.evaluateJavaScript(js) { _, error in
                if let error = error {
                    print("evaluateJavaScript onNativeLocaleReceived error: \(error)")
                }
            }
        }
    }

    // MARK: - WKScriptMessageHandler
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "NativeBridge" {
            if let body = message.body as? [String: Any], let action = body["action"] as? String {
                if action == "getNativeLocale" {
                    sendNativeLocaleToWeb()
                }
            } else {
                sendNativeLocaleToWeb()
            }
        }
    }

    // MARK: - WKNavigationDelegate
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // 頁面載入完成後主動推播一次 Native Locale
        sendNativeLocaleToWeb()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showErrorView(message: "無法連線至 Web 伺服器 (\(SERVER_BASE_URL))\n\n請確認 Node.js 伺服器已啟動且與電腦在同一個 Wi-Fi 網域。\n錯誤細節: \(error.localizedDescription)")
    }

    // MARK: - Error Screen UI
    private func showErrorView(message: String) {
        errorView?.removeFromSuperview()

        let container = UIView(frame: self.view.bounds)
        container.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        container.backgroundColor = UIColor(red: 11/255, green: 15/255, blue: 25/255, alpha: 1.0)

        let stack = UIStackView()
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false

        let iconLabel = UILabel()
        iconLabel.text = "⚠️"
        iconLabel.font = UIFont.systemFont(ofSize: 48)

        let titleLabel = UILabel()
        titleLabel.text = "無法連線至測試伺服器"
        titleLabel.textColor = .white
        titleLabel.font = UIFont.boldSystemFont(ofSize: 18)

        let descLabel = UILabel()
        descLabel.text = message
        descLabel.textColor = UIColor(white: 0.7, alpha: 1.0)
        descLabel.font = UIFont.systemFont(ofSize: 13)
        descLabel.textAlignment = .center
        descLabel.numberOfLines = 0

        let retryBtn = UIButton(type: .system)
        retryBtn.setTitle("🔄 重新連線", for: .normal)
        retryBtn.titleLabel?.font = UIFont.boldSystemFont(ofSize: 15)
        retryBtn.setTitleColor(.white, for: .normal)
        retryBtn.backgroundColor = UIColor(red: 99/255, green: 102/255, blue: 241/255, alpha: 1.0)
        retryBtn.layer.cornerRadius = 8
        retryBtn.contentEdgeInsets = UIEdgeInsets(top: 10, left: 24, bottom: 10, right: 24)
        retryBtn.addTarget(self, action: #selector(handleRetry), for: .touchUpInside)

        stack.addArrangedSubview(iconLabel)
        stack.addArrangedSubview(titleLabel)
        stack.addArrangedSubview(descLabel)
        stack.addArrangedSubview(retryBtn)

        container.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: container.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: container.trailingAnchor, constant: -24)
        ])

        self.view.addSubview(container)
        self.errorView = container
    }

    private func hideErrorView() {
        errorView?.removeFromSuperview()
        errorView = nil
    }

    @objc private func handleRetry() {
        loadWebServerUrl()
    }
}
