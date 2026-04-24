import SwiftUI

struct JobsView: View {
    @Environment(AppModel.self) private var appModel
    @State private var selectedTab: Int
    @State private var isPresentingEditor = false

    private let tabs = ["In Progress", "Backlog", "Completed"]

    init(initialTab: Int = 0) {
        _selectedTab = State(initialValue: initialTab)
    }

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

    private var canEditJobs: Bool {
        appModel.bootstrap?.user.isOwner == true
            || appModel.bootstrap?.user.platformRole == "admin"
            || appModel.bootstrap?.user.permissions.canEditJobs == true
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Picker("Jobs", selection: $selectedTab) {
                        ForEach(0..<tabs.count, id: \.self) { index in
                            Text(tabs[index]).tag(index)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                if filteredJobs.isEmpty {
                    ContentUnavailableView(
                        "No Jobs",
                        systemImage: "briefcase",
                        description: Text(emptyState)
                    )
                    .listRowBackground(Color.clear)
                } else {
                    let showFinancials = appModel.bootstrap?.user.permissions.canViewJobFinancials == true || appModel.bootstrap?.user.isOwner == true
                    ForEach(filteredJobs) { job in
                        NavigationLink(destination: JobDetailView(jobId: job.id, jobName: job.name)) {
                            JobRow(job: job, showFinancials: showFinancials)
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Jobs")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                if canEditJobs {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            isPresentingEditor = true
                        } label: {
                            Image(systemName: "plus")
                        }
                    }
                }
            }
            .refreshable {
                try? await appModel.refresh()
            }
            .sheet(isPresented: $isPresentingEditor) {
                JobEditorView(job: nil, onSaved: nil)
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
