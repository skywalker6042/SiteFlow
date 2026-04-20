import SwiftUI

struct ContentView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        Group {
            switch appModel.phase {
            case .loading:
                SplashView()
                    .task {
                        await appModel.restoreSession()
                    }
            case .signedOut:
                LoginView()
            case .signedIn:
                MainTabView()
            }
        }
    }
}

private struct SplashView: View {
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

private struct MainTabView: View {
    @Environment(AppModel.self) private var appModel

    private var permissions: Permissions? {
        appModel.bootstrap?.user.permissions
    }

    private var enabledFeatures: [String] {
        appModel.bootstrap?.org?.enabledFeatures ?? []
    }

    private var isOwner: Bool {
        appModel.bootstrap?.user.isOwner ?? false
    }

    private func hasFeature(_ feature: String) -> Bool {
        enabledFeatures.contains(feature)
    }

    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Home", systemImage: "square.grid.2x2.fill")
                }

            if permissions?.canViewJobs == true || isOwner {
                JobsView()
                    .tabItem {
                        Label("Jobs", systemImage: "hammer.fill")
                    }
            }

            if (permissions?.canViewCrew == true || isOwner) && hasFeature("crew") {
                CrewView()
                    .tabItem {
                        Label("Workers", systemImage: "person.3.fill")
                    }
            }

            if (permissions?.canViewSchedule == true || isOwner) && hasFeature("calendar") {
                CalendarView()
                    .tabItem {
                        Label("Calendar", systemImage: "calendar")
                    }
            }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
        }
        .accentColor(SiteFlowPalette.teal)
        .task {
            if appModel.bootstrap == nil {
                try? await appModel.refresh()
            }
        }
    }
}
