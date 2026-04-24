import SwiftUI

struct AccountView: View {
    @Environment(AppModel.self) private var appModel

    @State private var phone: String = ""
    @State private var isSaving = false
    @State private var message: String?

    private var workerId: String? { appModel.bootstrap?.user.workerId }

    var body: some View {
        Form {
            Section("Account") {
                infoRow(label: "Email", value: appModel.userEmail)

                TextField("Phone Number", text: $phone)
                    .keyboardType(.phonePad)

                if let message {
                    Text(message)
                        .font(.footnote)
                        .foregroundStyle(SiteFlowPalette.slate)
                }

                Button {
                    Task { @MainActor in
                        await save()
                    }
                } label: {
                    if isSaving {
                        ProgressView()
                    } else {
                        Text("Update Phone Number")
                    }
                }
                .disabled(isSaving || workerId == nil)
            }

            Section {
                Button(role: .destructive) {
                    Task { @MainActor in
                        await appModel.logout()
                    }
                } label: {
                    Text("Sign Out")
                }
            }
        }
        .navigationTitle("Account")
        .navigationBarTitleDisplayMode(.large)
        .task {
            phone = currentPhone
        }
    }

    private var currentPhone: String {
        let workers = appModel.bootstrap?.workers ?? []
        guard let workerId else { return "" }
        return workers.first(where: { $0.id == workerId })?.phone ?? ""
    }

    private func save() async {
        guard let workerId, let baseURL = appModel.serverURL else { return }
        isSaving = true
        defer { isSaving = false }

        do {
            var request = URLRequest(url: baseURL.appendingPathComponent("/api/mobile/workers/\(workerId)"))
            request.httpMethod = "PATCH"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(["phone": phone])
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                throw SiteFlowAPIError.invalidResponse
            }
            try? await appModel.refresh()
            message = "Phone number updated."
        } catch {
            message = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
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
}
