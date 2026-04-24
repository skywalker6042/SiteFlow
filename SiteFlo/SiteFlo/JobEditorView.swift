import SwiftUI

struct JobEditorView: View {
    @Environment(AppModel.self) private var appModel
    @Environment(\.dismiss) private var dismiss

    let job: JobDetailInfo?
    let onSaved: (() -> Void)?

    @State private var name = ""
    @State private var address = ""
    @State private var clientName = ""
    @State private var clientPhone = ""
    @State private var scope = ""
    @State private var status = "not_started"
    @State private var percentComplete = "0"
    @State private var totalValue = "0"
    @State private var amountBilled = "0"
    @State private var amountPaid = "0"
    @State private var plannedStart = ""
    @State private var plannedEnd = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    private let statuses: [(String, String)] = [
        ("not_started", "Not Started"),
        ("in_progress", "In Progress"),
        ("done", "Done"),
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section("Job") {
                    TextField("Job Name", text: $name)
                    TextField("Address", text: $address)
                    TextField("Client Name", text: $clientName)
                    TextField("Client Phone", text: $clientPhone)
                        .keyboardType(.phonePad)
                    TextField("Scope", text: $scope, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Schedule") {
                    TextField("Planned Start (YYYY-MM-DD)", text: $plannedStart)
                    TextField("Planned End (YYYY-MM-DD)", text: $plannedEnd)
                }

                Section("Status") {
                    Picker("Status", selection: $status) {
                        ForEach(statuses, id: \.0) { value, label in
                            Text(label).tag(value)
                        }
                    }
                    TextField("% Complete", text: $percentComplete)
                        .keyboardType(.numberPad)
                }

                Section("Financials") {
                    TextField("Contract Value", text: $totalValue)
                        .keyboardType(.decimalPad)
                    TextField("Billed", text: $amountBilled)
                        .keyboardType(.decimalPad)
                    TextField("Paid", text: $amountPaid)
                        .keyboardType(.decimalPad)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(SiteFlowPalette.red)
                    }
                }
            }
            .navigationTitle(job == nil ? "New Job" : "Edit Job")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { @MainActor in
                            await save()
                        }
                    }
                    .disabled(isSaving || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .task {
                guard let job else { return }
                name = job.name
                address = job.address ?? ""
                clientName = job.clientName ?? ""
                clientPhone = job.clientPhone ?? ""
                scope = job.scope ?? ""
                status = job.status
                percentComplete = String(job.percentComplete)
                totalValue = String(format: "%.0f", job.totalValue ?? 0)
                amountBilled = String(format: "%.0f", job.amountBilled ?? 0)
                amountPaid = String(format: "%.0f", job.amountPaid ?? 0)
                plannedStart = job.plannedStart ?? ""
                plannedEnd = job.plannedEnd ?? ""
            }
        }
    }

    private func save() async {
        guard let baseURL = appModel.serverURL else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        do {
            let payload: [String: Any] = [
                "name": name,
                "address": address,
                "clientName": clientName,
                "clientPhone": clientPhone,
                "scope": scope,
                "status": status,
                "percentComplete": Int(percentComplete) ?? 0,
                "totalValue": Double(totalValue) ?? 0,
                "amountBilled": Double(amountBilled) ?? 0,
                "amountPaid": Double(amountPaid) ?? 0,
                "plannedStart": plannedStart,
                "plannedEnd": plannedEnd,
            ]

            let url: URL
            let method: String
            if let job {
                url = baseURL.appendingPathComponent("/api/mobile/jobs/\(job.id)")
                method = "PUT"
            } else {
                url = baseURL.appendingPathComponent("/api/mobile/jobs")
                method = "POST"
            }

            var request = URLRequest(url: url)
            request.httpMethod = method
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                throw SiteFlowAPIError.invalidResponse
            }
            try? await appModel.refresh()
            onSaved?()
            dismiss()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
