import SwiftUI

struct CalendarView: View {
    @EnvironmentObject private var appModel: AppModel

    private var groupedDays: [(String, [WorkDaySummary])] {
        let workDays = appModel.bootstrap?.calendar.workDays ?? []
        let grouped = Dictionary(grouping: workDays, by: \.date)
        return grouped.keys.sorted().map { ($0, grouped[$0] ?? []) }
    }

    private var monthTitle: String {
        guard let calendar = appModel.bootstrap?.calendar else { return "Calendar" }

        var components = DateComponents()
        components.year = calendar.year
        components.month = calendar.month
        components.day = 1

        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: Calendar.current.date(from: components) ?? Date())
    }

    var body: some View {
        NavigationStack {
            SiteFlowScreen(title: "Calendar") {
                SiteFlowCard {
                    HStack {
                        Text(monthTitle)
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(SiteFlowPalette.ink)
                        Spacer()
                        Image(systemName: "calendar")
                            .foregroundStyle(SiteFlowPalette.teal)
                    }
                }

                if groupedDays.isEmpty {
                    SiteFlowCard {
                        Text("No work days are scheduled this month.")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(SiteFlowPalette.slate)
                    }
                } else {
                    ForEach(groupedDays, id: \.0) { date, items in
                        VStack(alignment: .leading, spacing: 12) {
                            SiteFlowSectionHeader(shortDateLabel(date))

                            ForEach(items) { day in
                                WorkDayRow(day: day)
                            }
                        }
                    }
                }
            }
            .refreshable {
                try? await appModel.refresh()
            }
        }
    }
}
