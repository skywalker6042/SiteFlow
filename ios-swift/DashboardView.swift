import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var appModel: AppModel

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Good Morning" }
        if hour < 17 { return "Good Afternoon" }
        return "Good Evening"
    }

    var body: some View {
        NavigationStack {
            SiteFlowScreen(title: "Dashboard") {
                header
                kpis
                upcomingDays
                activeJobs
            }
            .refreshable {
                try? await appModel.refresh()
            }
        }
    }

    private var header: some View {
        ZStack(alignment: .bottomLeading) {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [SiteFlowPalette.ink, Color.black.opacity(0.84)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            VStack(alignment: .leading, spacing: 18) {
                OrgPill(name: appModel.orgName, subtitle: "General Contractor")

                VStack(alignment: .leading, spacing: 6) {
                    Text("\(greeting), \(appModel.orgName)")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(.white)
                    Text("Here’s what’s going on across the business right now.")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Color.white.opacity(0.68))
                }
            }
            .padding(20)
        }
        .frame(height: 186)
    }

    private var kpis: some View {
        let dashboard = appModel.bootstrap?.dashboard

        return LazyVGrid(columns: [
            GridItem(.flexible(), spacing: 12),
            GridItem(.flexible(), spacing: 12)
        ], spacing: 12) {
            KpiView(title: "In Progress", value: "\(dashboard?.activeCount ?? 0)", icon: "hammer.fill", accent: SiteFlowPalette.teal)

            if appModel.bootstrap?.user.permissions.canViewJobFinancials == true || appModel.bootstrap?.user.isOwner == true {
                KpiView(title: "Outstanding", value: formatCurrency(dashboard?.totalOwed ?? 0), icon: "exclamationmark.circle.fill", accent: SiteFlowPalette.red)
                KpiView(title: "Billed", value: formatCurrency(dashboard?.totalBilled ?? 0), icon: "chart.line.uptrend.xyaxis", accent: SiteFlowPalette.blue)
                KpiView(title: "Unbilled", value: formatCurrency(dashboard?.totalUnbilled ?? 0), icon: "dollarsign.circle.fill", accent: SiteFlowPalette.amber)
            }
        }
    }

    private var upcomingDays: some View {
        VStack(alignment: .leading, spacing: 12) {
            SiteFlowSectionHeader("Next 7 Days")

            let upcoming = appModel.bootstrap?.dashboard?.upcomingDays ?? []
            if upcoming.isEmpty {
                SiteFlowCard {
                    Text("No work days scheduled this week.")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(SiteFlowPalette.slate)
                }
            } else {
                ForEach(upcoming) { day in
                    WorkDayRow(day: day)
                }
            }
        }
    }

    private var activeJobs: some View {
        VStack(alignment: .leading, spacing: 12) {
            SiteFlowSectionHeader("In Progress")

            let jobs = appModel.bootstrap?.dashboard?.activeJobs ?? []
            if jobs.isEmpty {
                SiteFlowCard {
                    Text("No jobs are in progress.")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(SiteFlowPalette.slate)
                }
            } else {
                ForEach(jobs) { job in
                    JobRow(job: job, showFinancials: appModel.bootstrap?.user.permissions.canViewJobFinancials == true || appModel.bootstrap?.user.isOwner == true)
                }
            }
        }
    }
}

private struct KpiView: View {
    let title: String
    let value: String
    let icon: String
    let accent: Color

    var body: some View {
        SiteFlowCard {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(accent)
                Text(title.uppercased())
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(SiteFlowPalette.slate)
            }

            Text(value)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(SiteFlowPalette.ink)
        }
    }
}

struct JobRow: View {
    let job: JobSummary
    let showFinancials: Bool

    var body: some View {
        let badge = statusBadge(for: job.status)

        SiteFlowCard {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(job.name)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(SiteFlowPalette.ink)
                    if let client = job.clientName, !client.isEmpty {
                        Text(client)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(SiteFlowPalette.slate)
                    }
                    if let address = job.address, !address.isEmpty {
                        Text(address)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(SiteFlowPalette.slate.opacity(0.92))
                    }
                }

                Spacer()

                StatusBadge(title: displayStatus(job.status), foreground: badge.0, background: badge.1)
            }

            VStack(alignment: .leading, spacing: 8) {
                ProgressView(value: Double(job.percentComplete), total: 100)
                    .tint(SiteFlowPalette.teal)

                HStack {
                    Text("\(job.percentComplete)% Complete")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(SiteFlowPalette.slate)

                    Spacer()

                    if showFinancials {
                        Text("\(formatCurrency(job.amountPaid ?? 0)) / \(formatCurrency(job.totalValue ?? 0))")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(SiteFlowPalette.teal)
                    }
                }
            }
        }
    }
}

struct WorkDayRow: View {
    let day: WorkDaySummary

    var body: some View {
        let badge = statusBadge(for: day.status)

        SiteFlowCard {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(shortDateLabel(day.date))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(SiteFlowPalette.ink)
                    Text(day.jobName)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(SiteFlowPalette.slate)

                    if !day.workers.isEmpty {
                        Text(day.workers.map(\.name).joined(separator: ", "))
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(SiteFlowPalette.slate.opacity(0.95))
                    }
                }

                Spacer()

                StatusBadge(title: displayStatus(day.status), foreground: badge.0, background: badge.1)
            }
        }
    }
}
