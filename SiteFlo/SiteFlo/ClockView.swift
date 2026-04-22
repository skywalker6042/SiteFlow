import SwiftUI

struct ClockEntry: Decodable, Identifiable {
    let id: String
    let clockIn: String
    let clockOut: String?
    let jobId: String?
    let jobName: String?
}

struct ClockJob: Decodable, Identifiable {
    let id: String
    let name: String
}

struct ClockState: Decodable {
    let open: ClockEntry?
    let logs: [ClockEntry]
    let jobs: [ClockJob]
    let workerName: String
}

struct ClockView: View {
    @Environment(AppModel.self) private var appModel

    @State private var state: ClockState?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedJobId: String = ""
    @State private var elapsed: String = ""
    @State private var elapsedTimer: Timer?

    private var isClockedIn: Bool { state?.open != nil }

    var body: some View {
        SiteFlowScreen(title: "Time Clock") {
            if isLoading && state == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 200)
            } else {
                VStack(spacing: 20) {
                    clockCard
                    if let logs = state?.logs, !logs.isEmpty {
                        todaySection(logs: logs)
                    }
                }
            }
        }
        .task { @MainActor in await load() }
        .refreshable { await load() }
    }

    private var clockCard: some View {
        SiteFlowCard {
            VStack(spacing: 20) {
                if let open = state?.open {
                    VStack(spacing: 6) {
                        Text("Clocked In")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(SiteFlowPalette.teal)
                        Text(elapsed)
                            .font(.system(size: 42, weight: .bold, design: .monospaced))
                            .foregroundStyle(SiteFlowPalette.ink)
                        if let jobName = open.jobName {
                            Label(jobName, systemImage: "hammer.fill")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(SiteFlowPalette.slate)
                        }
                        Text("Since \(formatTime(open.clockIn))")
                            .font(.system(size: 12))
                            .foregroundStyle(SiteFlowPalette.slate)
                    }
                } else {
                    VStack(spacing: 6) {
                        Image(systemName: "clock")
                            .font(.system(size: 36, weight: .light))
                            .foregroundStyle(SiteFlowPalette.slate)
                        Text("Not Clocked In")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(SiteFlowPalette.ink)
                        Text(formattedDate())
                            .font(.system(size: 13))
                            .foregroundStyle(SiteFlowPalette.slate)
                    }

                    if let jobs = state?.jobs, !jobs.isEmpty,
                       appModel.bootstrap?.settings?.trackWorkerJob == true {
                        Picker("Job", selection: $selectedJobId) {
                            Text("No job").tag("")
                            ForEach(jobs) { job in
                                Text(job.name).tag(job.id)
                            }
                        }
                        .pickerStyle(.menu)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(SiteFlowPalette.background)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }

                if let msg = errorMessage {
                    Text(msg)
                        .font(.system(size: 13))
                        .foregroundStyle(SiteFlowPalette.red)
                }

                Button {
                    Task { @MainActor in
                        if isClockedIn {
                            await clockOut()
                        } else {
                            await clockIn()
                        }
                    }
                } label: {
                    HStack(spacing: 8) {
                        if isLoading {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: isClockedIn ? "stop.circle.fill" : "play.circle.fill")
                        }
                        Text(isClockedIn ? "Clock Out" : "Clock In")
                            .font(.system(size: 16, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .foregroundStyle(.white)
                    .background(isClockedIn ? SiteFlowPalette.red : SiteFlowPalette.teal)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .disabled(isLoading)
            }
        }
    }

    private func todaySection(logs: [ClockEntry]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            SiteFlowSectionHeader("Today")
            SiteFlowCard {
                ForEach(Array(logs.enumerated()), id: \.element.id) { index, log in
                    if index > 0 { Divider() }
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            if let jobName = log.jobName {
                                Text(jobName)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(SiteFlowPalette.ink)
                            } else {
                                Text("No job")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(SiteFlowPalette.slate)
                            }
                            Text("\(formatTime(log.clockIn))\(log.clockOut != nil ? " – \(formatTime(log.clockOut!))" : "")")
                                .font(.system(size: 12))
                                .foregroundStyle(SiteFlowPalette.slate)
                        }
                        Spacer()
                        if let out = log.clockOut {
                            Text(duration(from: log.clockIn, to: out))
                                .font(.system(size: 13, weight: .semibold, design: .monospaced))
                                .foregroundStyle(SiteFlowPalette.ink)
                        } else {
                            Text("Active")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(SiteFlowPalette.teal)
                        }
                    }
                    .padding(.vertical, 10)
                }
            }
        }
    }

    // MARK: - Actions

    private func load() async {
        guard let baseURL = appModel.serverURL else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            var req = URLRequest(url: baseURL.appendingPathComponent("/api/mobile/clock"))
            req.setValue("application/json", forHTTPHeaderField: "Accept")
            req.timeoutInterval = 30
            let (data, _) = try await URLSession.shared.data(for: req)
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            state = try decoder.decode(ClockState.self, from: data)
            startTimer()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func clockIn() async {
        guard let baseURL = appModel.serverURL else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            var req = URLRequest(url: baseURL.appendingPathComponent("/api/mobile/clock"))
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.timeoutInterval = 30
            let body = selectedJobId.isEmpty ? [:] : ["jobId": selectedJobId]
            req.httpBody = try JSONEncoder().encode(body)
            let (data, _) = try await URLSession.shared.data(for: req)
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            let entry = try decoder.decode(ClockEntry.self, from: data)
            state = ClockState(
                open: entry,
                logs: [entry] + (state?.logs ?? []),
                jobs: state?.jobs ?? [],
                workerName: state?.workerName ?? ""
            )
            startTimer()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func clockOut() async {
        guard let baseURL = appModel.serverURL else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            var req = URLRequest(url: baseURL.appendingPathComponent("/api/mobile/clock"))
            req.httpMethod = "PATCH"
            req.timeoutInterval = 30
            let (data, _) = try await URLSession.shared.data(for: req)
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            let entry = try decoder.decode(ClockEntry.self, from: data)
            elapsedTimer?.invalidate()
            elapsedTimer = nil
            elapsed = ""
            state = ClockState(
                open: nil,
                logs: (state?.logs ?? []).map { $0.id == entry.id ? entry : $0 },
                jobs: state?.jobs ?? [],
                workerName: state?.workerName ?? ""
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Timer

    private func startTimer() {
        elapsedTimer?.invalidate()
        guard let open = state?.open else { return }
        let tick: () -> Void = {
            elapsed = duration(from: open.clockIn, to: nil)
        }
        tick()
        elapsedTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { _ in tick() }
    }

    // MARK: - Formatting

    private func formatTime(_ iso: String) -> String {
        guard let date = ISO8601DateFormatter().date(from: iso) else { return iso }
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f.string(from: date)
    }

    private func duration(from startISO: String, to endISO: String?) -> String {
        guard let start = ISO8601DateFormatter().date(from: startISO) else { return "" }
        let end = endISO.flatMap { ISO8601DateFormatter().date(from: $0) } ?? Date()
        let mins = Int(end.timeIntervalSince(start) / 60)
        let h = mins / 60; let m = mins % 60
        return h > 0 ? "\(h)h \(m)m" : "\(m)m"
    }

    private func formattedDate() -> String {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMMM d"
        return f.string(from: Date())
    }
}
