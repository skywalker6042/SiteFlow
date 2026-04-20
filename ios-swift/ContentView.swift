import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "house")
                }
            JobsView()
                .tabItem {
                    Label("Jobs", systemImage: "briefcase")
                }
            CrewView()
                .tabItem {
                    Label("Crew", systemImage: "person.3")
                }
            CalendarView()
                .tabItem {
                    Label("Calendar", systemImage: "calendar")
                }
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
        }
    }
}