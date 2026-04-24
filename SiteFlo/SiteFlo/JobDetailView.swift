import SwiftUI
import PhotosUI

struct JobDetailView: View {
    @Environment(AppModel.self) private var appModel
    let jobId: String
    let jobName: String

    @State private var detail: JobDetail?
    @State private var isLoading = false
    @State private var selectedTab = 0
    @State private var errorMessage: String?
    @State private var isPresentingEditor = false

    private var isOwner: Bool { appModel.bootstrap?.user.isOwner ?? false }
    private var permissions: Permissions? { appModel.bootstrap?.user.permissions }
    private var canEditTasks: Bool { isOwner || permissions?.canManageTasks == true }
    private var canCompleteTasks: Bool { isOwner || permissions?.canCompleteTasks == true }
    private var canViewFinancials: Bool { isOwner || permissions?.canViewJobFinancials == true }
    private var canUploadPhotos: Bool { isOwner || permissions?.canUploadPhotos == true }
    private var canEditJob: Bool { isOwner || appModel.bootstrap?.user.platformRole == "admin" || permissions?.canEditJobs == true }

    var body: some View {
        VStack(spacing: 0) {
            Picker("Tab", selection: $selectedTab) {
                Text("Overview").tag(0)
                Text("Tasks").tag(1)
                Text("Photos").tag(2)
                if canViewFinancials { Text("Financials").tag(3) }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(SiteFlowPalette.background)

            Divider()

            if isLoading && detail == nil {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let detail {
                ScrollView {
                    VStack(spacing: 16) {
                        switch selectedTab {
                        case 0: OverviewTab(detail: detail)
                        case 1: TasksTab(detail: detail, jobId: jobId, canComplete: canCompleteTasks, onTaskToggled: reload)
                        case 2: PhotosTab(detail: detail, jobId: jobId, canUpload: canUploadPhotos, onUploaded: reload)
                        case 3: FinancialsTab(detail: detail)
                        default: EmptyView()
                        }
                    }
                    .padding(16)
                }
                .refreshable { await load() }
            }
        }
        .background(SiteFlowPalette.background.ignoresSafeArea())
        .navigationTitle(jobName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if canEditJob, let detail {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Edit") {
                        isPresentingEditor = true
                    }
                }
            }
        }
        .sheet(isPresented: $isPresentingEditor) {
            if let detail {
                JobEditorView(job: detail.job, onSaved: reload)
            }
        }
        .task { @MainActor in await load() }
    }

    private func load() async {
        guard let baseURL = appModel.serverURL else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            var req = URLRequest(url: baseURL.appendingPathComponent("/api/mobile/jobs/\(jobId)"))
            req.setValue("application/json", forHTTPHeaderField: "Accept")
            req.timeoutInterval = 30
            let (data, _) = try await URLSession.shared.data(for: req)
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            detail = try decoder.decode(JobDetail.self, from: data)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func reload() {
        Task { @MainActor in
            await load()
        }
    }
}

// MARK: - Overview Tab

private struct OverviewTab: View {
    let detail: JobDetail

    private var job: JobDetailInfo { detail.job }

    var body: some View {
        VStack(spacing: 16) {
            // Status + progress
            SiteFlowCard {
                HStack {
                    StatusBadge(status: job.status)
                    Spacer()
                    Text("\(job.percentComplete)% complete")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(SiteFlowPalette.slate)
                }
                ProgressView(value: Double(job.percentComplete), total: 100)
                    .tint(SiteFlowPalette.teal)
            }

            // Client info
            if job.clientName != nil || job.clientPhone != nil || job.address != nil {
                SiteFlowCard {
                    SiteFlowSectionHeader("Client")
                    VStack(alignment: .leading, spacing: 8) {
                        if let name = job.clientName { infoRow("Name", name) }
                        if let phone = job.clientPhone {
                            Button {
                                if let url = URL(string: "tel:\(phone.filter { $0.isNumber })") {
                                    UIApplication.shared.open(url)
                                }
                            } label: {
                                infoRow("Phone", phone, teal: true)
                            }
                        }
                        if let address = job.address { infoRow("Address", address) }
                    }
                }
            }

            // Scope
            if let scope = job.scope, !scope.isEmpty {
                SiteFlowCard {
                    SiteFlowSectionHeader("Scope of Work")
                    Text(scope)
                        .font(.system(size: 14))
                        .foregroundStyle(SiteFlowPalette.ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            // Dates
            if job.plannedStart != nil || job.startDate != nil || job.endDate != nil {
                SiteFlowCard {
                    SiteFlowSectionHeader("Dates")
                    VStack(alignment: .leading, spacing: 8) {
                        if let d = job.plannedStart { infoRow("Planned Start", formatDate(d)) }
                        if let d = job.startDate    { infoRow("Start Date",    formatDate(d)) }
                        if let d = job.endDate      { infoRow("End Date",      formatDate(d)) }
                    }
                }
            }

            // Change orders summary
            if !detail.changeOrders.isEmpty {
                SiteFlowCard {
                    SiteFlowSectionHeader("Change Orders")
                    ForEach(Array(detail.changeOrders.enumerated()), id: \.element.id) { idx, co in
                        if idx > 0 { Divider() }
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(co.description)
                                    .font(.system(size: 14))
                                    .foregroundStyle(SiteFlowPalette.ink)
                                Text(co.approved ? "Approved" : "Pending")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(co.approved ? SiteFlowPalette.teal : SiteFlowPalette.amber)
                            }
                            Spacer()
                            Text(formatCurrency(co.amount))
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(SiteFlowPalette.ink)
                        }
                        .padding(.vertical, 6)
                    }
                }
            }
        }
    }

    private func infoRow(_ label: String, _ value: String, teal: Bool = false) -> some View {
        HStack(alignment: .top) {
            Text(label)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(SiteFlowPalette.slate)
                .frame(width: 100, alignment: .leading)
            Text(value)
                .font(.system(size: 13))
                .foregroundStyle(teal ? SiteFlowPalette.teal : SiteFlowPalette.ink)
            Spacer()
        }
    }

    private func formatDate(_ str: String) -> String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        guard let d = f.date(from: str) else { return str }
        let out = DateFormatter(); out.dateStyle = .medium
        return out.string(from: d)
    }
}

// MARK: - Tasks Tab

private struct TasksTab: View {
    let detail: JobDetail
    let jobId: String
    let canComplete: Bool
    let onTaskToggled: () -> Void

    @Environment(AppModel.self) private var appModel
    @State private var togglingIds: Set<String> = []

    private var phasedTasks: [(JobPhase?, [JobTask])] {
        var result: [(JobPhase?, [JobTask])] = []
        for phase in detail.phases {
            let tasks = detail.tasks.filter { $0.phaseId == phase.id }
            result.append((phase, tasks))
        }
        let unphased = detail.tasks.filter { $0.phaseId == nil }
        if !unphased.isEmpty { result.append((nil, unphased)) }
        return result
    }

    var body: some View {
        if detail.tasks.isEmpty {
            SiteFlowCard {
                Text("No tasks added yet.")
                    .font(.system(size: 14))
                    .foregroundStyle(SiteFlowPalette.slate)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 4)
            }
        } else {
            ForEach(Array(phasedTasks.enumerated()), id: \.offset) { _, group in
                let (phase, tasks) = group
                VStack(alignment: .leading, spacing: 8) {
                    if let phase {
                        HStack(spacing: 6) {
                            StatusBadge(status: phase.status)
                            Text(phase.name)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(SiteFlowPalette.ink)
                        }
                    }
                    SiteFlowCard {
                        ForEach(Array(tasks.enumerated()), id: \.element.id) { idx, task in
                            if idx > 0 { Divider() }
                            TaskRow(
                                task: task,
                                canComplete: canComplete,
                                isToggling: togglingIds.contains(task.id),
                                onToggle: { await toggle(task) }
                            )
                        }
                    }
                }
            }
        }
    }

    private func toggle(_ task: JobTask) async {
        guard let baseURL = appModel.serverURL else { return }
        togglingIds.insert(task.id)
        defer { togglingIds.remove(task.id) }
        let newStatus = task.status == "done" ? "todo" : "done"
        var req = URLRequest(url: baseURL.appendingPathComponent("/api/mobile/jobs/\(jobId)/tasks"))
        req.httpMethod = "PATCH"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.timeoutInterval = 30
        req.httpBody = try? JSONEncoder().encode(["taskId": task.id, "status": newStatus])
        _ = try? await URLSession.shared.data(for: req)
        onTaskToggled()
    }
}

private struct TaskRow: View {
    let task: JobTask
    let canComplete: Bool
    let isToggling: Bool
    let onToggle: () async -> Void

    var body: some View {
        HStack(spacing: 12) {
            if canComplete {
                Button {
                    Task { @MainActor in
                        await onToggle()
                    }
                } label: {
                    if isToggling {
                        ProgressView().frame(width: 22, height: 22)
                    } else {
                        Image(systemName: task.status == "done" ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 22))
                            .foregroundStyle(task.status == "done" ? SiteFlowPalette.teal : SiteFlowPalette.slate.opacity(0.4))
                    }
                }
                .buttonStyle(.plain)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(task.name)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(task.status == "done" ? SiteFlowPalette.slate : SiteFlowPalette.ink)
                    .strikethrough(task.status == "done")
                if let notes = task.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.system(size: 12))
                        .foregroundStyle(SiteFlowPalette.slate)
                }
            }
            Spacer()
            if task.status == "in_progress" {
                Text("In Progress")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(SiteFlowPalette.amber)
            }
        }
        .padding(.vertical, 8)
    }
}

// MARK: - Photos Tab

private struct PhotosTab: View {
    let detail: JobDetail
    let jobId: String
    let canUpload: Bool
    let onUploaded: () -> Void

    @Environment(AppModel.self) private var appModel
    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var isUploading = false

    private let columns = [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        VStack(spacing: 16) {
            if canUpload {
                PhotosPicker(selection: $selectedItems, maxSelectionCount: 10, matching: .images) {
                    Label("Add Photos", systemImage: "photo.badge.plus")
                        .font(.system(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .foregroundStyle(SiteFlowPalette.teal)
                        .background(SiteFlowPalette.teal.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .onChange(of: selectedItems) { _, items in
                    if !items.isEmpty {
                        Task { @MainActor in
                            await uploadPhotos(items)
                        }
                    }
                }

                if isUploading {
                    HStack(spacing: 8) {
                        ProgressView()
                        Text("Uploading…")
                            .font(.system(size: 13))
                            .foregroundStyle(SiteFlowPalette.slate)
                    }
                }
            }

            if detail.photos.isEmpty {
                SiteFlowCard {
                    Text("No photos yet.")
                        .font(.system(size: 14))
                        .foregroundStyle(SiteFlowPalette.slate)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 4)
                }
            } else {
                LazyVGrid(columns: columns, spacing: 4) {
                    ForEach(detail.photos) { photo in
                        if let url = photoURL(photo.storagePath) {
                            PhotoTile(url: url)
                        }
                    }
                }
            }
        }
    }

    private func photoURL(_ path: String) -> URL? {
        appModel.serverURL.flatMap { URL(string: $0.absoluteString + path) }
    }

    private func uploadPhotos(_ items: [PhotosPickerItem]) async {
        guard let baseURL = appModel.serverURL else { return }
        isUploading = true
        defer { isUploading = false; selectedItems = [] }

        for item in items {
            guard let data = try? await item.loadTransferable(type: Data.self) else { continue }
            var req = URLRequest(url: baseURL.appendingPathComponent("/api/mobile/jobs/\(jobId)/photos"))
            req.httpMethod = "POST"
            req.timeoutInterval = 60
            let boundary = UUID().uuidString
            req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
            var body = Data()
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"file\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(data)
            body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
            req.httpBody = body
            _ = try? await URLSession.shared.data(for: req)
        }
        onUploaded()
    }
}

private struct PhotoTile: View {
    let url: URL

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(SiteFlowPalette.border.opacity(0.35))

            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .empty:
                    ProgressView()
                        .tint(SiteFlowPalette.teal)
                default:
                    Image(systemName: "photo")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(SiteFlowPalette.slate)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .aspectRatio(1, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .contentShape(RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - Financials Tab

private struct FinancialsTab: View {
    let detail: JobDetail

    private var job: JobDetailInfo { detail.job }
    private var approvedCOTotal: Double {
        detail.changeOrders.filter(\.approved).reduce(0) { $0 + $1.amount }
    }
    private var contractTotal: Double { (job.totalValue ?? 0) + approvedCOTotal }
    private var outstanding: Double { contractTotal - (job.amountPaid ?? 0) }

    var body: some View {
        VStack(spacing: 16) {
            SiteFlowCard {
                SiteFlowSectionHeader("Summary")
                VStack(spacing: 12) {
                    finRow("Contract Value",  job.totalValue ?? 0,  color: SiteFlowPalette.ink)
                    if approvedCOTotal > 0 {
                        finRow("Approved Change Orders", approvedCOTotal, color: SiteFlowPalette.ink)
                        Divider()
                        finRow("Total Contract", contractTotal, color: SiteFlowPalette.ink, bold: true)
                    }
                    Divider()
                    finRow("Billed",      job.amountBilled ?? 0, color: SiteFlowPalette.blue)
                    finRow("Collected",   job.amountPaid ?? 0,   color: SiteFlowPalette.teal)
                    Divider()
                    finRow("Outstanding", outstanding,            color: outstanding > 0 ? SiteFlowPalette.amber : SiteFlowPalette.teal, bold: true)
                }
            }

            if !detail.changeOrders.isEmpty {
                SiteFlowCard {
                    SiteFlowSectionHeader("Change Orders")
                    ForEach(Array(detail.changeOrders.enumerated()), id: \.element.id) { idx, co in
                        if idx > 0 { Divider() }
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(co.description)
                                    .font(.system(size: 14))
                                    .foregroundStyle(SiteFlowPalette.ink)
                                Text(co.approved ? "Approved" : "Pending approval")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(co.approved ? SiteFlowPalette.teal : SiteFlowPalette.amber)
                            }
                            Spacer()
                            Text(formatCurrency(co.amount))
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(SiteFlowPalette.ink)
                        }
                        .padding(.vertical, 6)
                    }
                }
            }

            if let token = detail.job.shareToken, let baseURL = URL(string: "https://siteflo.app/share/\(token)") {
                Link(destination: baseURL) {
                    Label("View Invoice", systemImage: "doc.text")
                        .font(.system(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .foregroundStyle(.white)
                        .background(SiteFlowPalette.blue)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }

    private func finRow(_ label: String, _ value: Double, color: Color, bold: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14, weight: bold ? .semibold : .regular))
                .foregroundStyle(SiteFlowPalette.slate)
            Spacer()
            Text(formatCurrency(value))
                .font(.system(size: 14, weight: bold ? .bold : .semibold))
                .foregroundStyle(color)
        }
    }
}
