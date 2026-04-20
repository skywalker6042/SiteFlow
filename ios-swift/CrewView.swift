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
        HStack(spacing: 12) {
            Circle()
                .fill(Color.blue)
                .frame(width: 40, height: 40)
                .overlay(
                    Text("SW")
                        .foregroundColor(.white)
                        .font(.headline)
                )
            VStack(alignment: .leading, spacing: 4) {
                Text("Sample Worker")
                    .font(.headline)
                Text("Specialty: Electrician")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Text("Role: Worker")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text("sample@email.com")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Button(action: {
                    // Edit action
                }) {
                    Image(systemName: "pencil")
                        .foregroundColor(.blue)
                }
            }
        }
        .padding(.vertical, 8)
    }
}