import SwiftUI

struct CrewView: View {
    @Environment(AppModel.self) private var appModel

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
                        WorkerRow(worker: worker)
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Crew")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                try? await appModel.refresh()
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
                        Label(phone, systemImage: "phone")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
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
