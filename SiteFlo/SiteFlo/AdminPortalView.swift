import SwiftUI

struct AdminPortalView: View {
    @Environment(AppModel.self) private var appModel

    @State private var enteringOrgId: String?
    @State private var errorMessage: String?

    private var portal: AdminPortalPayload? {
        appModel.bootstrap?.adminPortal
    }

    var body: some View {
        NavigationStack {
            SiteFlowScreen(title: "Admin Portal") {
                if let portal {
                    VStack(spacing: 18) {
                        countCards(portal.counts)
                        orgList(portal.orgs)
                        accountCard
                    }
                } else {
                    SiteFlowCard {
                        Text("No admin data is available.")
                            .font(.system(size: 14))
                            .foregroundStyle(SiteFlowPalette.slate)
                    }
                }
            }
            .refreshable {
                try? await appModel.refresh()
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func countCards(_ counts: AdminPortalCounts) -> some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                countCard("Total", value: counts.total, tint: SiteFlowPalette.ink)
                countCard("Active", value: counts.active, tint: SiteFlowPalette.teal)
            }

            HStack(spacing: 12) {
                countCard("Trial", value: counts.trial, tint: SiteFlowPalette.amber)
                countCard("Suspended", value: counts.suspended, tint: SiteFlowPalette.red)
            }
        }
    }

    private func orgList(_ orgs: [AdminPortalOrg]) -> some View {
        SiteFlowCard {
            SiteFlowSectionHeader("Organizations")

            if let errorMessage {
                Text(errorMessage)
                    .font(.system(size: 13))
                    .foregroundStyle(SiteFlowPalette.red)
            }

            if orgs.isEmpty {
                Text("No organizations found.")
                    .font(.system(size: 14))
                    .foregroundStyle(SiteFlowPalette.slate)
            } else {
                ForEach(Array(orgs.enumerated()), id: \.element.id) { index, org in
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(org.name)
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(SiteFlowPalette.ink)
                                Text("\(org.memberCount) members • \(org.jobCount) jobs")
                                    .font(.system(size: 12))
                                    .foregroundStyle(SiteFlowPalette.slate)
                            }

                            Spacer()

                            StatusBadge(status: org.status)
                        }

                        HStack {
                            Text(org.plan.capitalized)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(SiteFlowPalette.blue)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(SiteFlowPalette.blue.opacity(0.12))
                                .clipShape(Capsule())

                            Spacer()

                            Button {
                                Task { @MainActor in
                                    await enter(orgId: org.id)
                                }
                            } label: {
                                if enteringOrgId == org.id {
                                    ProgressView()
                                        .tint(.white)
                                        .frame(width: 20, height: 20)
                                } else {
                                    Text("Open")
                                        .font(.system(size: 13, weight: .semibold))
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(SiteFlowPalette.teal)
                            .disabled(enteringOrgId != nil)
                        }
                    }
                    .padding(.vertical, 6)

                    if index < orgs.count - 1 {
                        Divider()
                    }
                }
            }
        }
    }

    private var accountCard: some View {
        SiteFlowCard {
            SiteFlowSectionHeader("Account")
            Text(appModel.userEmail)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(SiteFlowPalette.ink)

            Button(role: .destructive) {
                Task { @MainActor in
                    await appModel.logout()
                }
            } label: {
                Text("Sign Out")
            }
        }
    }

    private func countCard(_ label: String, value: Int, tint: Color) -> some View {
        SiteFlowCard {
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(SiteFlowPalette.slate)
            Text("\(value)")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(tint)
        }
    }

    private func enter(orgId: String) async {
        guard let baseURL = appModel.serverURL else { return }
        enteringOrgId = orgId
        errorMessage = nil
        defer { enteringOrgId = nil }

        do {
            var request = URLRequest(url: baseURL.appendingPathComponent("/api/mobile/admin/select-org"))
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(["orgId": orgId])
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                throw SiteFlowAPIError.invalidResponse
            }
            try await appModel.refresh()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
