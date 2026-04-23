import SwiftUI

struct MoreView: View {
    @Environment(AppModel.self) private var appModel

    private var permissions: Permissions? { appModel.bootstrap?.user.permissions }
    private var isOwner: Bool { appModel.bootstrap?.user.isOwner ?? false }
    private var enabledFeatures: [String] { appModel.bootstrap?.org?.enabledFeatures ?? [] }

    private func hasFeature(_ feature: String) -> Bool {
        enabledFeatures.contains(feature)
    }

    var body: some View {
        NavigationStack {
            List {
                if (permissions?.canViewCrew == true || isOwner) && hasFeature("crew") {
                    NavigationLink(destination: CrewView()) {
                        Label("Workers", systemImage: "person.3.fill")
                    }
                }

                if (isOwner || permissions?.canViewFinancials == true) && hasFeature("financials") {
                    NavigationLink(destination: FinancialsView()) {
                        Label("Financials", systemImage: "chart.bar.fill")
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
