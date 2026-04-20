import SwiftUI

struct SettingsView: View {
    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Account")) {
                    NavigationLink(destination: Text("Profile View")) {
                        Text("Profile")
                    }
                    Button(action: {
                        // Logout action
                    }) {
                        Text("Logout")
                            .foregroundColor(.red)
                    }
                }
                Section(header: Text("App")) {
                    Toggle("Notifications", isOn: .constant(true))
                    Picker("Theme", selection: .constant(0)) {
                        Text("Light").tag(0)
                        Text("Dark").tag(1)
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}