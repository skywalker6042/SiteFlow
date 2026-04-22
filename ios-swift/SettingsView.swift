import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var appModel: AppModel

    var body: some View {
        NavigationStack {
            SiteFlowScreen(title: "Settings") {
                profileCard
                invoiceCard
                crewCard
                accountCard
            }
        }
    }

    private var profileCard: some View {
        SiteFlowCard {
            Text("Company Profile")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(SiteFlowPalette.ink)

            infoRow(label: "Company", value: appModel.bootstrap?.settings?.companyName ?? appModel.orgName)
            infoRow(label: "Phone", value: appModel.bootstrap?.settings?.companyPhone ?? "Not set")
            infoRow(label: "Plan", value: appModel.bootstrap?.org?.plan.capitalized ?? "Trial")
            infoRow(label: "Status", value: appModel.bootstrap?.org?.status.capitalized ?? "Unknown")
        }
    }

    private var invoiceCard: some View {
        SiteFlowCard {
            Text("Invoice Settings")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(SiteFlowPalette.ink)

            toggleRow(title: "Separate Change Orders", value: appModel.bootstrap?.settings?.coSeparateInvoice ?? false)
            toggleRow(title: "Require Signature", value: appModel.bootstrap?.settings?.requireSignature ?? false)
        }
    }

    private var crewCard: some View {
        SiteFlowCard {
            Text("Crew & Time Tracking")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(SiteFlowPalette.ink)

            toggleRow(title: "Track Worker Time", value: appModel.bootstrap?.settings?.trackWorkerTime ?? false)
            toggleRow(title: "Track Worker by Job", value: appModel.bootstrap?.settings?.trackWorkerJob ?? false)
        }
    }

    private var accountCard: some View {
        SiteFlowCard {
            Text("Account")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(SiteFlowPalette.ink)

            infoRow(label: "Signed In As", value: appModel.userEmail)
            infoRow(label: "Server", value: appModel.serverURLString)

            Button(role: .destructive) {
                Task { @MainActor in
                    await appModel.logout()
                }
            } label: {
                Text("Sign Out")
                    .font(.system(size: 15, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .tint(SiteFlowPalette.red)
        }
    }

    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(SiteFlowPalette.slate)
            Spacer()
            Text(value)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(SiteFlowPalette.ink)
                .multilineTextAlignment(.trailing)
        }
    }

    private func toggleRow(title: String, value: Bool) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(SiteFlowPalette.slate)
            Spacer()
            Image(systemName: value ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundStyle(value ? SiteFlowPalette.teal : SiteFlowPalette.slate)
        }
    }
}
