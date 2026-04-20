import SwiftUI

struct JobsView: View {
    @State private var selectedTab = 0
    let tabs = ["In Progress", "Backlog", "Completed"]

    var body: some View {
        NavigationView {
            VStack {
                Picker("Tab", selection: $selectedTab) {
                    ForEach(0..<tabs.count) { index in
                        Text(tabs[index]).tag(index)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding(.horizontal)

                List {
                    ForEach(0..<5) { _ in
                        JobCard()
                    }
                }
                .listStyle(PlainListStyle())
            }
            .navigationTitle("Jobs")
            .navigationBarItems(trailing: Button(action: {
                // New Job action
            }) {
                Image(systemName: "plus")
            })
        }
    }
}