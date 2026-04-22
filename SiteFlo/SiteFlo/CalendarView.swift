import SwiftUI

enum CalendarMode: String, CaseIterable {
    case day      = "Day"
    case week     = "Week"
    case month    = "Month"
    case schedule = "Schedule"
}

struct CalendarView: View {
    @Environment(AppModel.self) private var appModel

    @State private var mode: CalendarMode = .week
    @State private var anchor: Date = Calendar.current.startOfDay(for: Date())
    @State private var workDays: [WorkDaySummary] = []
    @State private var isLoading = false
    @State private var selectedDay: Date? = nil

    private let cal = Calendar.current

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Mode picker
                Picker("View", selection: $mode) {
                    ForEach(CalendarMode.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(SiteFlowPalette.background)

                Divider()

                ScrollView {
                    VStack(spacing: 16) {
                        switch mode {
                        case .day:      DayView(anchor: anchor, workDays: workDays, navigate: navigate)
                        case .week:     WeekView(anchor: anchor, workDays: workDays, navigate: navigate)
                        case .month:    MonthView(anchor: anchor, workDays: workDays, navigate: navigate, selectedDay: $selectedDay)
                        case .schedule: ScheduleView(workDays: workDays)
                        }
                    }
                    .padding(16)
                }
                .refreshable { await fetchData() }
            }
            .navigationTitle("Schedule")
            .navigationBarTitleDisplayMode(.inline)
            .overlay {
                if isLoading && workDays.isEmpty {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
        .task { @MainActor in await fetchData() }
        .onChange(of: mode)   { _, _ in Task { @MainActor in await fetchData() } }
        .onChange(of: anchor) { _, _ in Task { @MainActor in await fetchData() } }
    }

    private func navigate(by value: Int) {
        let component: Calendar.Component = mode == .day ? .day : mode == .week ? .weekOfYear : .month
        anchor = cal.date(byAdding: component, value: value, to: anchor) ?? anchor
        selectedDay = nil
    }

    private func fetchData() async {
        guard let baseURL = appModel.serverURL else { return }
        isLoading = true
        defer { isLoading = false }

        let (start, end) = dateRange()
        guard let url = URL(string: "\(baseURL.absoluteString)/api/mobile/schedule?start=\(start)&end=\(end)") else { return }

        var req = URLRequest(url: url)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.timeoutInterval = 30

        do {
            let (data, _) = try await URLSession.shared.data(for: req)
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            let response = try decoder.decode(ScheduleResponse.self, from: data)
            workDays = response.workDays
        } catch {
            // Keep existing data on error
        }
    }

    private func dateRange() -> (String, String) {
        let fmt = isoDateFormatter()
        switch mode {
        case .day:
            return (fmt.string(from: anchor), fmt.string(from: anchor))
        case .week:
            let weekStart = cal.date(from: cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: anchor))!
            let weekEnd   = cal.date(byAdding: .day, value: 6, to: weekStart)!
            return (fmt.string(from: weekStart), fmt.string(from: weekEnd))
        case .month:
            let comps     = cal.dateComponents([.year, .month], from: anchor)
            let monthStart = cal.date(from: comps)!
            let monthEnd   = cal.date(byAdding: DateComponents(month: 1, day: -1), to: monthStart)!
            return (fmt.string(from: monthStart), fmt.string(from: monthEnd))
        case .schedule:
            let end = cal.date(byAdding: .day, value: 90, to: anchor)!
            return (fmt.string(from: anchor), fmt.string(from: end))
        }
    }
}

private struct ScheduleResponse: Decodable {
    let workDays: [WorkDaySummary]
}

// MARK: - Day View

private struct DayView: View {
    let anchor: Date
    let workDays: [WorkDaySummary]
    let navigate: (Int) -> Void

    private var todayItems: [WorkDaySummary] {
        let key = isoDateFormatter().string(from: anchor)
        return workDays.filter { $0.date == key }
    }

    var body: some View {
        VStack(spacing: 16) {
            NavHeader(title: dayTitle(anchor), onPrev: { navigate(-1) }, onNext: { navigate(1) })

            if todayItems.isEmpty {
                EmptyDayCard()
            } else {
                ForEach(todayItems) { day in WorkDayRow(day: day) }
            }
        }
    }
}

// MARK: - Week View

private struct WeekView: View {
    let anchor: Date
    let workDays: [WorkDaySummary]
    let navigate: (Int) -> Void

    private let cal = Calendar.current

    private var weekDays: [Date] {
        let weekStart = cal.date(from: cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: anchor))!
        return (0..<7).compactMap { cal.date(byAdding: .day, value: $0, to: weekStart) }
    }

    private var title: String {
        guard let first = weekDays.first, let last = weekDays.last else { return "" }
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return "\(f.string(from: first)) – \(f.string(from: last))"
    }

    private func items(for date: Date) -> [WorkDaySummary] {
        let key = isoDateFormatter().string(from: date)
        return workDays.filter { $0.date == key }
    }

    var body: some View {
        VStack(spacing: 16) {
            NavHeader(title: title, onPrev: { navigate(-1) }, onNext: { navigate(1) })

            ForEach(weekDays, id: \.self) { day in
                let dayItems = items(for: day)
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(weekDayLabel(day))
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(isToday(day) ? SiteFlowPalette.teal : SiteFlowPalette.slate)
                        if !dayItems.isEmpty {
                            Text("\(dayItems.count)")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(SiteFlowPalette.teal)
                                .clipShape(Capsule())
                        }
                    }

                    if dayItems.isEmpty {
                        Text("No work scheduled")
                            .font(.system(size: 13))
                            .foregroundStyle(SiteFlowPalette.slate.opacity(0.6))
                            .padding(.vertical, 4)
                    } else {
                        ForEach(dayItems) { day in WorkDayRow(day: day) }
                    }
                }
                .padding(.bottom, 4)

                if day != weekDays.last { Divider() }
            }
        }
        .padding(16)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
    }
}

// MARK: - Month View

private struct MonthView: View {
    let anchor: Date
    let workDays: [WorkDaySummary]
    let navigate: (Int) -> Void
    @Binding var selectedDay: Date?

    private let cal = Calendar.current
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 0), count: 7)
    private let dayLetters = ["S","M","T","W","T","F","S"]

    private var monthDays: [Date?] {
        let comps  = cal.dateComponents([.year, .month], from: anchor)
        let first  = cal.date(from: comps)!
        let offset = (cal.component(.weekday, from: first) - cal.firstWeekday + 7) % 7
        let range  = cal.range(of: .day, in: .month, for: first)!
        var days: [Date?] = Array(repeating: nil, count: offset)
        for i in 0..<range.count {
            days.append(cal.date(byAdding: .day, value: i, to: first))
        }
        while days.count % 7 != 0 { days.append(nil) }
        return days
    }

    private var workedDates: Set<String> {
        Set(workDays.map(\.date))
    }

    private var selectedItems: [WorkDaySummary] {
        guard let day = selectedDay else { return [] }
        let key = isoDateFormatter().string(from: day)
        return workDays.filter { $0.date == key }
    }

    private var monthTitle: String {
        let f = DateFormatter(); f.dateFormat = "MMMM yyyy"
        return f.string(from: anchor)
    }

    var body: some View {
        VStack(spacing: 16) {
            NavHeader(title: monthTitle, onPrev: { navigate(-1) }, onNext: { navigate(1) })

            // Grid
            VStack(spacing: 0) {
                HStack(spacing: 0) {
                    ForEach(dayLetters, id: \.self) { letter in
                        Text(letter)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(SiteFlowPalette.slate)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                    }
                }

                LazyVGrid(columns: columns, spacing: 0) {
                    ForEach(Array(monthDays.enumerated()), id: \.offset) { _, date in
                        if let date {
                            let key = isoDateFormatter().string(from: date)
                            let hasWork = workedDates.contains(key)
                            let isSelected = selectedDay.map { cal.isDate($0, inSameDayAs: date) } ?? false

                            Button {
                                selectedDay = isSelected ? nil : date
                            } label: {
                                VStack(spacing: 3) {
                                    Text("\(cal.component(.day, from: date))")
                                        .font(.system(size: 14, weight: isToday(date) ? .bold : .regular))
                                        .foregroundStyle(isSelected ? .white : isToday(date) ? SiteFlowPalette.teal : SiteFlowPalette.ink)
                                        .frame(width: 30, height: 30)
                                        .background(isSelected ? SiteFlowPalette.teal : Color.clear)
                                        .clipShape(Circle())

                                    Circle()
                                        .fill(hasWork ? SiteFlowPalette.teal : Color.clear)
                                        .frame(width: 5, height: 5)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 4)
                            }
                            .buttonStyle(.plain)
                        } else {
                            Color.clear.frame(height: 44)
                        }
                    }
                }
            }
            .padding(12)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.04), radius: 8, y: 2)

            // Selected day or full list
            if let day = selectedDay {
                VStack(alignment: .leading, spacing: 8) {
                    Text(weekDayLabel(day))
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(SiteFlowPalette.slate)
                    if selectedItems.isEmpty {
                        EmptyDayCard()
                    } else {
                        ForEach(selectedItems) { item in WorkDayRow(day: item) }
                    }
                }
            } else {
                let grouped = Dictionary(grouping: workDays, by: \.date)
                ForEach(grouped.keys.sorted(), id: \.self) { date in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(shortDateLabel(date))
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(SiteFlowPalette.slate)
                        ForEach(grouped[date] ?? []) { day in WorkDayRow(day: day) }
                    }
                }
            }
        }
    }
}

// MARK: - Schedule View

private struct ScheduleView: View {
    let workDays: [WorkDaySummary]

    private var grouped: [(String, [WorkDaySummary])] {
        let g = Dictionary(grouping: workDays, by: \.date)
        return g.keys.sorted().map { ($0, g[$0] ?? []) }
    }

    var body: some View {
        if grouped.isEmpty {
            SiteFlowCard {
                Text("No upcoming work days in the next 90 days.")
                    .font(.system(size: 14))
                    .foregroundStyle(SiteFlowPalette.slate)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            }
        } else {
            ForEach(grouped, id: \.0) { date, items in
                VStack(alignment: .leading, spacing: 8) {
                    SiteFlowSectionHeader(shortDateLabel(date))
                    ForEach(items) { day in WorkDayRow(day: day) }
                }
            }
        }
    }
}

// MARK: - Shared components

private struct NavHeader: View {
    let title: String
    let onPrev: () -> Void
    let onNext: () -> Void

    var body: some View {
        HStack {
            Button(action: onPrev) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(SiteFlowPalette.teal)
                    .frame(width: 36, height: 36)
                    .background(SiteFlowPalette.teal.opacity(0.08))
                    .clipShape(Circle())
            }
            Spacer()
            Text(title)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(SiteFlowPalette.ink)
            Spacer()
            Button(action: onNext) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(SiteFlowPalette.teal)
                    .frame(width: 36, height: 36)
                    .background(SiteFlowPalette.teal.opacity(0.08))
                    .clipShape(Circle())
            }
        }
    }
}

private struct EmptyDayCard: View {
    var body: some View {
        SiteFlowCard {
            Text("No work scheduled")
                .font(.system(size: 14))
                .foregroundStyle(SiteFlowPalette.slate)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 4)
        }
    }
}

// MARK: - Helpers

private func isoDateFormatter() -> DateFormatter {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    f.locale = Locale(identifier: "en_US_POSIX")
    return f
}

private func isToday(_ date: Date) -> Bool {
    Calendar.current.isDateInToday(date)
}

private func dayTitle(_ date: Date) -> String {
    let f = DateFormatter()
    f.dateFormat = "EEEE, MMMM d"
    return f.string(from: date)
}

private func weekDayLabel(_ date: Date) -> String {
    let f = DateFormatter()
    f.dateFormat = "EEEE, MMM d"
    return f.string(from: date)
}
