import SwiftUI

struct ContentView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        SiteFloWebShellView(baseURL: appModel.serverURL ?? URL(string: "https://siteflo.app")!)
    }
}

struct SplashView: View {
    var body: some View {
        ZStack {
            SiteFlowPalette.ink.ignoresSafeArea()

            VStack(spacing: 18) {
                Image("Logo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 80, height: 80)

                Text("SiteFlo")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(.white)

                ProgressView()
                    .tint(.white)
            }
        }
    }
}
