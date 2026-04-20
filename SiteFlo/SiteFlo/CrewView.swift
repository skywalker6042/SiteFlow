import SwiftUI

struct CrewView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        NavigationStack {
            SiteFlowScreen(title: "Workers") {
                let workers = appModel.bootstrap?.workers ?? []

                if workers.isEmpty {
                    SiteFlowCard {
                        Text("No workers are available for this account.")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(SiteFlowPalette.slate)
                    }
                } else {
                    ForEach(workers) { worker in
                        WorkerRow(worker: worker)
                    }
                }
            }
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
        SiteFlowCard {
            HStack(alignment: .top, spacing: 14) {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [SiteFlowPalette.teal, SiteFlowPalette.blue],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 46, height: 46)
                    .overlay(
                        Text(initials)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                    )

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(worker.name)
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(SiteFlowPalette.ink)

                        if let roleName = worker.roleName, !roleName.isEmpty {
                            Text(roleName)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(SiteFlowPalette.teal)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(SiteFlowPalette.teal.opacity(0.12))
                                .clipShape(Capsule())
                        }
                    }

                    if let role = worker.role, !role.isEmpty {
                        Text(role.capitalized)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(SiteFlowPalette.slate)
                    }

                    if !worker.specialties.isEmpty {
                        FlexibleTagCloud(tags: worker.specialties.map(\.name))
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        if let loginEmail = worker.loginEmail, !loginEmail.isEmpty {
                            Label(loginEmail, systemImage: "envelope")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(SiteFlowPalette.slate)
                        }

                        if let phone = worker.phone, !phone.isEmpty {
                            Label(phone, systemImage: "phone")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(SiteFlowPalette.slate)
                        }
                    }
                }
            }
        }
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
