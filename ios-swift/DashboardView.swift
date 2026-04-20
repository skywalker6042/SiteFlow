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
                        KPICard(title: "Total Owed", value: "$0.00", icon: "dollarsign.circle")
                        KPICard(title: "Total Billed", value: "$0.00", icon: "doc.text")
                        KPICard(title: "Active Jobs", value: "0", icon: "briefcase")
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
        VStack(alignment: .leading) {
            Text("Job Name")
                .font(.headline)
            Text("Client: Client Name")
                .font(.subheadline)
            Text("Address")
                .font(.caption)
            ProgressView(value: 0.5)
                .progressViewStyle(LinearProgressViewStyle())
            Text("50% Complete")
                .font(.caption)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
        .padding(.horizontal)
    }
}

struct WorkDayCard: View {
    var body: some View {
        VStack(alignment: .leading) {
            Text("Work Day Date")
                .font(.headline)
            Text("Job: Job Name")
                .font(.subheadline)
            Text("Assigned Workers: 2")
                .font(.caption)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
        .padding(.horizontal)
    }
}