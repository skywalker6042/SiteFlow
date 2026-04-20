import SwiftUI

struct CrewView: View {
    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Workers")) {
                    ForEach(0..<10) { _ in
                        WorkerRow()
                    }
                }
            }
            .navigationTitle("Crew")
            .navigationBarItems(trailing: Button(action: {
                // Add Worker action
            }) {
                Image(systemName: "plus")
            })
        }
    }
}

struct WorkerRow: View {
    var body: some View {
        HStack {
            Circle()
                .fill(Color.blue)
                .frame(width: 40, height: 40)
            VStack(alignment: .leading) {
                Text("Worker Name")
                    .font(.headline)
                Text("Specialty")
                    .font(.subheadline)
            }
            Spacer()
            Text("Role")
                .font(.caption)
        }
        .padding(.vertical, 5)
    }
}