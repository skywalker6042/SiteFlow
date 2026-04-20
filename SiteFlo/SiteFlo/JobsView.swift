import SwiftUI

struct JobsView: View {
    @Environment(AppModel.self) private var appModel
    @State private var selectedTab = 0

    private let tabs = ["In Progress", "Backlog", "Completed"]

    private var filteredJobs: [JobSummary] {
        let jobs = appModel.bootstrap?.jobs ?? []

        switch selectedTab {
        case 1:
            return jobs.filter { $0.status == "not_started" || $0.status == "planned" }
        case 2:
            return jobs.filter { $0.status == "done" }
        default:
            return jobs.filter { $0.status == "in_progress" }
        }
    }

    var body: some View {
        NavigationStack {
            SiteFlowScreen(title: "Jobs") {
                Picker("Jobs", selection: $selectedTab) {
                    ForEach(0..<tabs.count, id: \.self) { index in
                        Text(tabs[index]).tag(index)
                    }
                }
                .pickerStyle(.segmented)

                if filteredJobs.isEmpty {
                    SiteFlowCard {
                        Text(emptyState)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(SiteFlowPalette.slate)
                    }
                } else {
                    let showFinancials = appModel.bootstrap?.user.permissions.canViewJobFinancials == true || appModel.bootstrap?.user.isOwner == true
                    ForEach(filteredJobs) { job in
                        NavigationLink(destination: JobDetailView(jobId: job.id, jobName: job.name)) {
                            JobRow(job: job, showFinancials: showFinancials)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .refreshable {
                try? await appModel.refresh()
            }
        }
    }

    private var emptyState: String {
        switch selectedTab {
        case 1:
            return "No jobs are sitting in the backlog."
        case 2:
            return "No completed jobs yet."
        default:
            return "No jobs are currently in progress."
        }
    }
}
