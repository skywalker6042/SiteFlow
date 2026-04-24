import SwiftUI

struct ContentView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        Group {
            switch appModel.phase {
            case .loading:
                SplashView()
                    .task { @MainActor in
                        await appModel.restoreSession()
                    }
            case .signedOut:
                LoginView()
            case .signedIn:
                if appModel.bootstrap?.user.platformRole == "admin",
                   appModel.bootstrap?.org == nil,
                   appModel.bootstrap?.adminPortal != nil {
                    AdminPortalView()
                } else {
                    MainTabView()
                }
            }
        }
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

    private var canViewFinancials: Bool {
        (permissions?.canViewFinancials == true || isOwner) && hasFeature("financials")
    }

    private var canUseClock: Bool {
        (appModel.bootstrap?.settings?.trackWorkerTime == true) && hasFeature("time_clock")
    }

    private var clockTabLabel: String {
        isOwner || appModel.bootstrap?.user.platformRole == "admin" ? "Team Time" : "Clock"
    }

    private func hasFeature(_ feature: String) -> Bool {
        enabledFeatures.contains(feature)
    }

    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }

            if permissions?.canViewJobs == true || isOwner {
                JobsView()
                    .tabItem {
                        Label("Jobs", systemImage: "briefcase.fill")
                    }
            }

            if (permissions?.canViewSchedule == true || isOwner) && hasFeature("calendar") {
                CalendarView()
                    .tabItem {
                        Label("Schedule", systemImage: "calendar")
                    }
            }

            if canUseClock {
                ClockView()
                    .tabItem {
                        Label(clockTabLabel, systemImage: "clock.fill")
                    }
            } else if canViewFinancials {
                NavigationStack {
                    FinancialsView()
                }
                    .tabItem {
                        Label("Financials", systemImage: "chart.bar.fill")
                    }
            }

            MoreView()
                .tabItem {
                    Label("More", systemImage: "ellipsis.circle.fill")
                }
        }
        .tint(SiteFlowPalette.teal)
        .task { @MainActor in
            if appModel.bootstrap == nil {
                try? await appModel.refresh()
            }
        }
    }
}
