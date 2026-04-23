import SwiftUI

struct FinancialsMonth: Decodable, Identifiable {
    let month: Int
    let contracted: Double
    let billed: Double
    let collected: Double

    var id: Int { month }
}

struct FinancialsSummary: Decodable {
    let contracted: Double
    let billed: Double
    let collected: Double
    let outstanding: Double
    let unbilled: Double
    let jobsDone: Int
    let jobsActive: Int
    let jobsPending: Int
}

struct FinancialsJob: Decodable, Identifiable {
    let id: String
    let name: String
    let clientName: String?
    let status: String
    let totalValue: Double
    let amountBilled: Double
    let amountPaid: Double

    var outstanding: Double { totalValue - amountPaid }
}

struct FinancialsSnapshot: Decodable {
    let year: Int
    let summary: FinancialsSummary
    let months: [FinancialsMonth]
    let outstandingJobs: [FinancialsJob]
}

struct FinancialsView: View {
    @Environment(AppModel.self) private var appModel

    @State private var snapshot: FinancialsSnapshot?
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        SiteFlowScreen(title: "Financials") {
            if isLoading && snapshot == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 220)
            } else if let snapshot {
                VStack(spacing: 18) {
                    summaryGrid(snapshot.summary)
                    monthlyCollection(snapshot.months, year: snapshot.year)
                    outstandingSection(snapshot.outstandingJobs)
                }
            } else if let errorMessage {
                SiteFlowCard {
                    Text(errorMessage)
                        .font(.system(size: 14))
                        .foregroundStyle(SiteFlowPalette.red)
                }
            } else {
                SiteFlowCard {
                    Text("No financial data is available yet.")
                        .font(.system(size: 14))
                        .foregroundStyle(SiteFlowPalette.slate)
                }
            }
        }
        .task { @MainActor in await load() }
        .refreshable { await load() }
    }

    private func summaryGrid(_ summary: FinancialsSummary) -> some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                metricCard(title: "Contracted", value: formatCurrency(summary.contracted), tint: SiteFlowPalette.ink)
                metricCard(title: "Collected", value: formatCurrency(summary.collected), tint: SiteFlowPalette.teal)
            }

            HStack(spacing: 12) {
                metricCard(title: "Outstanding", value: formatCurrency(summary.outstanding), tint: summary.outstanding > 0 ? SiteFlowPalette.amber : SiteFlowPalette.teal)
                metricCard(title: "Unbilled", value: formatCurrency(summary.unbilled), tint: summary.unbilled > 0 ? SiteFlowPalette.blue : SiteFlowPalette.teal)
            }

            SiteFlowCard {
                SiteFlowSectionHeader("Pipeline")
                HStack {
                    pipelinePill(label: "Active", value: summary.jobsActive, tint: SiteFlowPalette.blue)
                    Spacer()
                    pipelinePill(label: "Done", value: summary.jobsDone, tint: SiteFlowPalette.teal)
                    Spacer()
                    pipelinePill(label: "Pending", value: summary.jobsPending, tint: SiteFlowPalette.amber)
                }
            }
        }
    }

    private func monthlyCollection(_ months: [FinancialsMonth], year: Int) -> some View {
        SiteFlowCard {
            SiteFlowSectionHeader("Monthly Cash Flow")
            Text(String(year))
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(SiteFlowPalette.slate)

            ForEach(months.filter { $0.contracted > 0 || $0.billed > 0 || $0.collected > 0 }) { month in
                VStack(alignment: .leading, spacing: 8) {
                    Text(monthLabel(month.month))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(SiteFlowPalette.ink)

                    amountRow("Contracted", month.contracted, tint: SiteFlowPalette.ink)
                    amountRow("Billed", month.billed, tint: SiteFlowPalette.blue)
                    amountRow("Collected", month.collected, tint: SiteFlowPalette.teal)
                }
                .padding(.vertical, 4)

                if month.id != months.last?.id {
                    Divider()
                }
            }
        }
    }

    private func outstandingSection(_ jobs: [FinancialsJob]) -> some View {
        SiteFlowCard {
            SiteFlowSectionHeader("Outstanding Jobs")

            if jobs.isEmpty {
                Text("All job balances are collected.")
                    .font(.system(size: 14))
                    .foregroundStyle(SiteFlowPalette.slate)
            } else {
                ForEach(Array(jobs.enumerated()), id: \.element.id) { index, job in
                    NavigationLink(destination: JobDetailView(jobId: job.id, jobName: job.name)) {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(alignment: .top) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(job.name)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(SiteFlowPalette.ink)
                                    if let clientName = job.clientName, !clientName.isEmpty {
                                        Text(clientName)
                                            .font(.system(size: 12))
                                            .foregroundStyle(SiteFlowPalette.slate)
                                    }
                                }

                                Spacer()

                                StatusBadge(status: job.status)
                            }

                            HStack {
                                amountLabel("Contract", value: job.totalValue, tint: SiteFlowPalette.ink)
                                Spacer()
                                amountLabel("Paid", value: job.amountPaid, tint: SiteFlowPalette.teal)
                                Spacer()
                                amountLabel("Due", value: job.outstanding, tint: SiteFlowPalette.amber)
                            }
                        }
                        .padding(.vertical, 8)
                    }
                    .buttonStyle(.plain)

                    if index < jobs.count - 1 {
                        Divider()
                    }
                }
            }
        }
    }

    private func metricCard(title: String, value: String, tint: Color) -> some View {
        SiteFlowCard {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(SiteFlowPalette.slate)
            Text(value)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(tint)
        }
    }

    private func pipelinePill(label: String, value: Int, tint: Color) -> some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(tint)
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(SiteFlowPalette.slate)
        }
    }

    private func amountRow(_ label: String, _ value: Double, tint: Color) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(SiteFlowPalette.slate)
            Spacer()
            Text(formatCurrency(value))
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(tint)
        }
    }

    private func amountLabel(_ label: String, value: Double, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(SiteFlowPalette.slate)
            Text(formatCurrency(value))
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(tint)
        }
    }

    private func monthLabel(_ month: Int) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM"
        return formatter.monthSymbols[max(0, min(month - 1, 11))]
    }

    private func load() async {
        guard let baseURL = appModel.serverURL else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            var request = URLRequest(url: baseURL.appendingPathComponent("/api/mobile/financials"))
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            request.timeoutInterval = 30
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                throw SiteFlowAPIError.invalidResponse
            }

            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            snapshot = try decoder.decode(FinancialsSnapshot.self, from: data)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
