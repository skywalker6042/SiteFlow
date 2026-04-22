import SwiftUI

struct DashboardView: View {
    @Environment(AppModel.self) private var appModel

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Good Morning" }
        if hour < 17 { return "Good Afternoon" }
        return "Good Evening"
    }

    var body: some View {
        NavigationStack {
            List {
                headerSection
                metricsSection
                upcomingSection
                jobsSection
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Home")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                try? await appModel.refresh()
            }
        }
    }

    private var headerSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                Text("\(greeting), \(appModel.orgName)")
                    .font(.title2.weight(.bold))
                Text("Here’s what’s going on across the business right now.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var metricsSection: some View {
        let dashboard = appModel.bootstrap?.dashboard
        let canViewFinancials = appModel.bootstrap?.user.permissions.canViewJobFinancials == true || appModel.bootstrap?.user.isOwner == true

        return Section("Overview") {
            DashboardMetricRow(title: "In Progress", value: "\(dashboard?.activeCount ?? 0)", systemImage: "hammer.fill", tint: SiteFlowPalette.teal)

            if canViewFinancials {
                DashboardMetricRow(title: "Outstanding", value: formatCurrency(dashboard?.totalOwed ?? 0), systemImage: "exclamationmark.circle.fill", tint: SiteFlowPalette.red)
                DashboardMetricRow(title: "Billed", value: formatCurrency(dashboard?.totalBilled ?? 0), systemImage: "chart.line.uptrend.xyaxis", tint: SiteFlowPalette.blue)
                DashboardMetricRow(title: "Unbilled", value: formatCurrency(dashboard?.totalUnbilled ?? 0), systemImage: "dollarsign.circle.fill", tint: SiteFlowPalette.amber)
            }
        }
    }

    private var upcomingSection: some View {
        let upcoming = appModel.bootstrap?.dashboard?.upcomingDays ?? []

        return Section("Next 7 Days") {
            if upcoming.isEmpty {
                ContentUnavailableView(
                    "No Work Scheduled",
                    systemImage: "calendar.badge.exclamationmark",
                    description: Text("No work days are scheduled this week.")
                )
                .listRowBackground(Color.clear)
            } else {
                ForEach(upcoming) { day in
                    WorkDayRow(day: day)
                }
            }
        }
    }

    private var jobsSection: some View {
        let jobs = appModel.bootstrap?.dashboard?.activeJobs ?? []
        let showFinancials = appModel.bootstrap?.user.permissions.canViewJobFinancials == true || appModel.bootstrap?.user.isOwner == true

        return Section("In Progress") {
            if jobs.isEmpty {
                ContentUnavailableView(
                    "No Active Jobs",
                    systemImage: "briefcase",
                    description: Text("No jobs are in progress.")
                )
                .listRowBackground(Color.clear)
            } else {
                ForEach(jobs) { job in
                    NavigationLink(destination: JobDetailView(jobId: job.id, jobName: job.name)) {
                        JobRow(job: job, showFinancials: showFinancials)
                    }
                }
            }
        }
    }
}

private struct DashboardMetricRow: View {
    let title: String
    let value: String
    let systemImage: String
    let tint: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .foregroundStyle(tint)
                .frame(width: 24)

            Text(title)

            Spacer()

            Text(value)
                .fontWeight(.semibold)
                .foregroundStyle(.primary)
        }
    }
}

struct JobRow: View {
    let job: JobSummary
    let showFinancials: Bool

    var body: some View {
        let badge = statusBadge(for: job.status)

        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(job.name)
                        .font(.headline)
                        .foregroundStyle(.primary)

                    if let client = job.clientName, !client.isEmpty {
                        Text(client)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    if let address = job.address, !address.isEmpty {
                        Text(address)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                StatusBadge(title: displayStatus(job.status), foreground: badge.0, background: badge.1)
            }

            ProgressView(value: Double(job.percentComplete), total: 100)
                .tint(SiteFlowPalette.teal)

            HStack {
                Text("\(job.percentComplete)% Complete")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.secondary)

                Spacer()

                if showFinancials {
                    Text("\(formatCurrency(job.amountPaid ?? 0)) / \(formatCurrency(job.totalValue ?? 0))")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(SiteFlowPalette.teal)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct WorkDayRow: View {
    let day: WorkDaySummary

    var body: some View {
        let badge = statusBadge(for: day.status)

        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(shortDateLabel(day.date))
                        .font(.headline)
                    Text(day.jobName)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    if !day.workers.isEmpty {
                        Text(day.workers.map(\.name).joined(separator: ", "))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                StatusBadge(title: displayStatus(day.status), foreground: badge.0, background: badge.1)
            }
        }
        .padding(.vertical, 4)
    }
}
