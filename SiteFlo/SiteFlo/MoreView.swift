import SwiftUI

struct MoreView: View {
    @Environment(AppModel.self) private var appModel

    private var permissions: Permissions? { appModel.bootstrap?.user.permissions }
    private var isOwner: Bool { appModel.bootstrap?.user.isOwner ?? false }
    private var enabledFeatures: [String] { appModel.bootstrap?.org?.enabledFeatures ?? [] }

    var body: some View {
        NavigationStack {
            List {
                if permissions?.canViewCrew == true || isOwner {
                    NavigationLink(destination: CrewView()) {
                        Label("Workers", systemImage: "person.3.fill")
                    }
                }

                if isOwner || permissions?.canViewFinancials == true {
                    NavigationLink(destination: ComingSoonView(title: "Financials")) {
                        Label("Financials", systemImage: "chart.bar.fill")
                    }
                }

                if isOwner || permissions?.canViewActivity == true {
                    NavigationLink(destination: ComingSoonView(title: "Activity")) {
                        Label("Activity", systemImage: "clock.arrow.circlepath")
                    }
                }

                NavigationLink(destination: SettingsView()) {
                    Label("Settings", systemImage: "gearshape.fill")
                }
            }
            .navigationTitle("More")
        }
    }
}

private struct ComingSoonView: View {
    let title: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "hammer.circle")
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(SiteFlowPalette.slate)
            Text(title)
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(SiteFlowPalette.ink)
            Text("Coming soon in the mobile app.\nVisit siteflo.app to access this feature.")
                .font(.system(size: 14))
                .foregroundStyle(SiteFlowPalette.slate)
                .multilineTextAlignment(.center)
        }
        .padding()
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
