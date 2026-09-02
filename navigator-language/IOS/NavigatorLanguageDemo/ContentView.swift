import SwiftUI

struct ContentView: View {
    var body: some View {
        ViewControllerWrapper()
            .edgesIgnoringSafeArea(.all)
    }
}

// UIViewControllerRepresentable Wrapper 將 UIKit 的 ViewController 橋接至 SwiftUI
struct ViewControllerWrapper: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> ViewController {
        return ViewController()
    }

    func updateUIViewController(_ uiViewController: ViewController, context: Context) {
    }
}

#Preview {
    ContentView()
}
