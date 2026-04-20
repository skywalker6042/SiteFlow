import SwiftUI

struct CalendarView: View {
    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Upcoming Work Days")) {
                    ForEach(0..<7) { _ in
                        WorkDayCard()
                    }
                }
            }
            .navigationTitle("Calendar")
        }
    }
}