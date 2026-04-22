import SwiftUI
import UIKit
import WebKit

@MainActor
final class SiteFloWebViewModel: NSObject, ObservableObject {
    @Published var isLoading = false
    @Published var didFinishInitialLoad = false
    @Published var errorMessage: String?

    let webView: WKWebView

    private let baseURL: URL
    private var hasLoadedInitialPage = false
    private var observers: [NSKeyValueObservation] = []

    init(baseURL: URL) {
        self.baseURL = baseURL

        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.keyboardDismissMode = .interactive
        webView.isOpaque = false
        webView.backgroundColor = UIColor.clear

        self.webView = webView

        super.init()

        webView.navigationDelegate = self
        webView.uiDelegate = self

        observers = [
            webView.observe(\.isLoading, options: [.initial, .new]) { [weak self] webView, _ in
                Task { @MainActor in
                    self?.isLoading = webView.isLoading
                }
            }
        ]
    }

    func loadIfNeeded() {
        guard !hasLoadedInitialPage else { return }
        hasLoadedInitialPage = true
        load(path: "/dashboard")
    }

    func reload() {
        errorMessage = nil
        webView.reload()
    }

    func goHome() {
        load(path: "/dashboard")
    }

    private func load(path: String) {
        errorMessage = nil
        let cleanPath = path.hasPrefix("/") ? path : "/" + path
        guard let url = URL(string: cleanPath, relativeTo: baseURL)?.absoluteURL else {
            errorMessage = "The SiteFlo URL is invalid."
            return
        }
        webView.load(URLRequest(url: url))
    }

    private func openExternally(_ url: URL) {
        UIApplication.shared.open(url)
    }

    private func isInternalURL(_ url: URL) -> Bool {
        guard let host = baseURL.host else { return false }
        return url.host == host
    }
}

extension SiteFloWebViewModel: WKNavigationDelegate, WKUIDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        errorMessage = nil
        didFinishInitialLoad = true
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code == NSURLErrorCancelled { return }
        errorMessage = error.localizedDescription
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code == NSURLErrorCancelled { return }
        errorMessage = error.localizedDescription
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        let scheme = url.scheme?.lowercased()
        if scheme == "tel" || scheme == "mailto" {
            openExternally(url)
            decisionHandler(.cancel)
            return
        }

        if navigationAction.targetFrame == nil {
            if isInternalURL(url) {
                webView.load(URLRequest(url: url))
            } else {
                openExternally(url)
            }
            decisionHandler(.cancel)
            return
        }

        if let scheme, scheme.hasPrefix("http"), !isInternalURL(url) {
            openExternally(url)
            decisionHandler(.cancel)
            return
        }

        decisionHandler(.allow)
    }
}

private struct SiteFloWebView: UIViewRepresentable {
    let webView: WKWebView

    func makeUIView(context: Context) -> WKWebView {
        webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
    }
}

struct SiteFloWebShellView: View {
    @StateObject private var model: SiteFloWebViewModel

    init(baseURL: URL) {
        _model = StateObject(wrappedValue: SiteFloWebViewModel(baseURL: baseURL))
    }

    var body: some View {
        ZStack {
            SiteFlowPalette.background
                .ignoresSafeArea()

            SiteFloWebView(webView: model.webView)
                .ignoresSafeArea()

            if model.isLoading && !model.didFinishInitialLoad {
                SplashView()
            }

            if let errorMessage = model.errorMessage, !model.isLoading {
                errorOverlay(message: errorMessage)
            }
        }
        .task {
            model.loadIfNeeded()
        }
    }

    @ViewBuilder
    private func errorOverlay(message: String) -> some View {
        VStack(spacing: 14) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 32, weight: .semibold))
                .foregroundStyle(SiteFlowPalette.red)

            Text("Couldn’t Load SiteFlo")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(SiteFlowPalette.ink)

            Text(message)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(SiteFlowPalette.slate)
                .multilineTextAlignment(.center)

            Button("Try Again") {
                model.goHome()
            }
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 22)
            .padding(.vertical, 12)
            .background(SiteFlowPalette.teal)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .padding(24)
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .padding(24)
    }
}
