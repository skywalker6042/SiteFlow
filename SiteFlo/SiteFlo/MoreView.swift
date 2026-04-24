import SwiftUI

struct MoreView: View {
    @Environment(AppModel.self) private var appModel
    @State private var isLeavingOrg = false

    private var permissions: Permissions? { appModel.bootstrap?.user.permissions }
    private var isOwner: Bool { appModel.bootstrap?.user.isOwner ?? false }
    private var enabledFeatures: [String] { appModel.bootstrap?.org?.enabledFeatures ?? [] }
    private var isPlatformAdmin: Bool { appModel.bootstrap?.user.platformRole == "admin" }

    private func hasFeature(_ feature: String) -> Bool {
        enabledFeatures.contains(feature)
    }

    var body: some View {
        NavigationStack {
            List {
                if isPlatformAdmin {
                    Button {
                        Task { @MainActor in
                            await leaveOrgContext()
                        }
                    } label: {
                        HStack {
                            Label("Admin Portal", systemImage: "building.2.fill")
                            Spacer()
                            if isLeavingOrg {
                                ProgressView()
                            }
                        }
                    }
                    .disabled(isLeavingOrg)
                }

                if (permissions?.canViewCrew == true || isOwner) && hasFeature("crew") {
                    NavigationLink(destination: CrewView()) {
                        Label("Workers", systemImage: "person.3.fill")
                    }
                }

                if isOwner && hasFeature("receipt_tracking") {
                    NavigationLink(destination: ReceiptsView()) {
                        Label("Receipts", systemImage: "receipt.fill")
                    }
                }

                if (isOwner || permissions?.canViewFinancials == true) && hasFeature("financials") {
                    NavigationLink(destination: FinancialsView()) {
                        Label("Financials", systemImage: "chart.bar.fill")
                    }
                }

                if isOwner || isPlatformAdmin {
                    NavigationLink(destination: SettingsView()) {
                        Label("Settings", systemImage: "gearshape.fill")
                    }
                } else {
                    NavigationLink(destination: AccountView()) {
                        Label("Account", systemImage: "person.crop.circle")
                    }
                }
            }
            .navigationTitle("More")
        }
    }

    private func leaveOrgContext() async {
        guard let baseURL = appModel.serverURL else { return }
        isLeavingOrg = true
        defer { isLeavingOrg = false }

        var request = URLRequest(url: baseURL.appendingPathComponent("/api/mobile/admin/clear-org"))
        request.httpMethod = "POST"
        _ = try? await URLSession.shared.data(for: request)
        try? await appModel.refresh()
    }
}
