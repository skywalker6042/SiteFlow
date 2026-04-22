import SwiftUI

struct SettingsView: View {
    @Environment(AppModel.self) private var appModel

    private var serverLabel: String {
        appModel.serverURL?.absoluteString ?? "https://siteflo.app"
    }

    var body: some View {
        Form {
            profileSection
            invoiceSection
            crewSection
            accountSection
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.large)
    }

    private var profileSection: some View {
        Section("Company Profile") {
            infoRow(label: "Company", value: appModel.bootstrap?.settings?.companyName ?? appModel.orgName)
            infoRow(label: "Phone", value: appModel.bootstrap?.settings?.companyPhone ?? "Not set")
            infoRow(label: "Plan", value: appModel.bootstrap?.org?.plan.capitalized ?? "Trial")
            infoRow(label: "Status", value: appModel.bootstrap?.org?.status.capitalized ?? "Unknown")
        }
    }

    private var invoiceSection: some View {
        Section("Invoice Settings") {
            toggleRow(title: "Separate Change Orders", value: appModel.bootstrap?.settings?.coSeparateInvoice ?? false)
            toggleRow(title: "Require Signature", value: appModel.bootstrap?.settings?.requireSignature ?? false)
        }
    }

    private var crewSection: some View {
        Section("Crew & Time Tracking") {
            toggleRow(title: "Track Worker Time", value: appModel.bootstrap?.settings?.trackWorkerTime ?? false)
            toggleRow(title: "Track Worker by Job", value: appModel.bootstrap?.settings?.trackWorkerJob ?? false)
        }
    }

    private var accountSection: some View {
        Section("Account") {
            infoRow(label: "Signed In As", value: appModel.userEmail)
            infoRow(label: "Server", value: serverLabel)

            Button(role: .destructive) {
                Task {
                    await appModel.logout()
                }
            } label: {
                Text("Sign Out")
            }
        }
    }

    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text(value)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.trailing)
        }
    }

    private func toggleRow(title: String, value: Bool) -> some View {
        HStack {
            Text(title)
            Spacer()
            Image(systemName: value ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundStyle(value ? SiteFlowPalette.teal : SiteFlowPalette.slate)
        }
    }
}
