import SwiftUI

struct CrewView: View {
    @Environment(AppModel.self) private var appModel
    @State private var selectedWorker: WorkerSummary?
    @State private var isAddingWorker = false

    private var isOwner: Bool {
        appModel.bootstrap?.user.isOwner == true || appModel.bootstrap?.user.platformRole == "admin"
    }

    var body: some View {
        NavigationStack {
            List {
                let workers = appModel.bootstrap?.workers ?? []

                if workers.isEmpty {
                    ContentUnavailableView(
                        "No Workers",
                        systemImage: "person.3",
                        description: Text("No workers are available for this account.")
                    )
                    .listRowBackground(Color.clear)
                } else {
                    ForEach(workers) { worker in
                        Button {
                            if isOwner {
                                selectedWorker = worker
                            }
                        } label: {
                            WorkerRow(worker: worker)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Crew")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                if isOwner {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            isAddingWorker = true
                        } label: {
                            Image(systemName: "plus")
                        }
                    }
                }
            }
            .refreshable {
                try? await appModel.refresh()
            }
            .sheet(item: $selectedWorker) { worker in
                WorkerEditorView(worker: worker)
            }
            .sheet(isPresented: $isAddingWorker) {
                WorkerEditorView(worker: nil)
            }
        }
    }
}

private struct WorkerRow: View {
    let worker: WorkerSummary

    private var initials: String {
        let parts = worker.name.split(separator: " ")
        if parts.count > 1 {
            return String(parts.first?.prefix(1) ?? "") + String(parts.last?.prefix(1) ?? "")
        }
        return String(worker.name.prefix(2)).uppercased()
    }

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [SiteFlowPalette.teal, SiteFlowPalette.blue],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 42, height: 42)
                .overlay(
                    Text(initials)
                        .font(.footnote.bold())
                        .foregroundStyle(.white)
                )

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(worker.name)
                        .font(.headline)

                    if let roleName = worker.roleName, !roleName.isEmpty {
                        Text(roleName)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(SiteFlowPalette.teal)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(SiteFlowPalette.teal.opacity(0.12))
                            .clipShape(Capsule())
                    }
                }

                if let role = worker.role, !role.isEmpty {
                    Text(role.capitalized)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                if !worker.specialties.isEmpty {
                    FlexibleTagCloud(tags: worker.specialties.map(\.name))
                }

                VStack(alignment: .leading, spacing: 4) {
                    if let loginEmail = worker.loginEmail, !loginEmail.isEmpty {
                        Label(loginEmail, systemImage: "envelope")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    if let phone = worker.phone, !phone.isEmpty {
                        let digits = phone.filter { $0.isNumber }
                        if let url = URL(string: "tel:\(digits)"), !digits.isEmpty {
                            Link(destination: url) {
                                Label(phone, systemImage: "phone")
                                    .font(.footnote)
                                    .foregroundStyle(SiteFlowPalette.teal)
                            }
                        } else {
                            Label(phone, systemImage: "phone")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

private struct FlexibleTagCloud: View {
    let tags: [String]

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 88), spacing: 8)], alignment: .leading, spacing: 8) {
            ForEach(tags, id: \.self) { tag in
                Text(tag)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(SiteFlowPalette.teal)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(SiteFlowPalette.tealSoft)
                    .clipShape(Capsule())
            }
        }
    }
}

private struct WorkerEditorView: View {
    @Environment(AppModel.self) private var appModel
    @Environment(\.dismiss) private var dismiss

    let worker: WorkerSummary?

    @State private var name: String = ""
    @State private var phone: String = ""
    @State private var role: String = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Worker") {
                    TextField("Name", text: $name)
                    TextField("Phone", text: $phone)
                        .keyboardType(.phonePad)
                    TextField("Role / Title", text: $role)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(SiteFlowPalette.red)
                    }
                }
            }
            .navigationTitle(worker == nil ? "Add Worker" : "Edit Worker")
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
                name = worker?.name ?? ""
                phone = worker?.phone ?? ""
                role = worker?.role ?? ""
            }
        }
    }

    private func save() async {
        guard let baseURL = appModel.serverURL else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        do {
            let payload = [
                "name": name,
                "phone": phone,
                "role": role,
            ]

            let url: URL
            let method: String
            if let worker {
                url = baseURL.appendingPathComponent("/api/mobile/workers/\(worker.id)")
                method = "PATCH"
            } else {
                url = baseURL.appendingPathComponent("/api/mobile/workers")
                method = "POST"
            }

            var request = URLRequest(url: url)
            request.httpMethod = method
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(payload)
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                throw SiteFlowAPIError.invalidResponse
            }

            try? await appModel.refresh()
            dismiss()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
