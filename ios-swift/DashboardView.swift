import SwiftUI

struct DashboardView: View {
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text(greeting())
                        .font(.largeTitle)
                        .padding(.horizontal)

                    // KPI Cards
                    HStack(spacing: 10) {
                        KPICard(title: "Total Owed", value: "$5,000.00", icon: "dollarsign.circle")
                        KPICard(title: "Total Billed", value: "$15,000.00", icon: "doc.text")
                        KPICard(title: "Active Jobs", value: "3", icon: "briefcase")
                    }
                    .padding(.horizontal)

                    // Active Jobs
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("Active Jobs")
                                .font(.headline)
                            Spacer()
                            NavigationLink(destination: JobsView()) {
                                Text("See All")
                                    .foregroundColor(.blue)
                            }
                        }
                        .padding(.horizontal)

                        ForEach(0..<3) { _ in
                            JobCard()
                        }
                    }

                    // Upcoming Work Days
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("Upcoming Work Days")
                                .font(.headline)
                            Spacer()
                            NavigationLink(destination: CalendarView()) {
                                Text("See All")
                                    .foregroundColor(.blue)
                            }
                        }
                        .padding(.horizontal)

                        ForEach(0..<2) { _ in
                            WorkDayCard()
                        }
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Dashboard")
        }
    }

    private func greeting() -> String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 {
            return "Good Morning"
        } else if hour < 17 {
            return "Good Afternoon"
        } else {
            return "Good Evening"
        }
    }
}

struct KPICard: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        VStack {
            Image(systemName: icon)
                .font(.largeTitle)
                .foregroundColor(.blue)
            Text(value)
                .font(.title)
                .fontWeight(.bold)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
}

struct JobCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Sample Job Name")
                    .font(.headline)
                Spacer()
                Text("In Progress")
                    .font(.caption)
                    .padding(4)
                    .background(Color.blue.opacity(0.2))
                    .cornerRadius(4)
            }
            Text("Client: Sample Client")
                .font(.subheadline)
                .foregroundColor(.secondary)
            Text("123 Sample Address")
                .font(.caption)
                .foregroundColor(.secondary)
            ProgressView(value: 0.5)
                .progressViewStyle(LinearProgressViewStyle(tint: .blue))
            HStack {
                Text("50% Complete")
                    .font(.caption)
                Spacer()
                Text("$10,000 / $20,000")
                    .font(.caption)
                    .foregroundColor(.green)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
        .padding(.horizontal)
    }
}

struct WorkDayCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("2026-04-25")
                    .font(.headline)
                Spacer()
                Text("Planned")
                    .font(.caption)
                    .padding(4)
                    .background(Color.purple.opacity(0.2))
                    .cornerRadius(4)
            }
            Text("Job: Sample Job")
                .font(.subheadline)
                .foregroundColor(.secondary)
            Text("Crew: Worker 1, Worker 2")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
        .padding(.horizontal)
    }
}