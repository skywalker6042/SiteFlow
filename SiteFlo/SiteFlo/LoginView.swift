import SwiftUI

struct LoginView: View {
    @Environment(AppModel.self) private var appModel

    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    VStack(spacing: 12) {
                        Image("Logo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 68, height: 68)

                        Text("SiteFlo")
                            .font(.largeTitle.bold())

                        Text("Sign in to your contractor workspace")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        if let errorMessage = appModel.errorMessage {
                            ContentUnavailableView {
                                Label("Sign-In Error", systemImage: "exclamationmark.triangle.fill")
                            } description: {
                                Text(errorMessage)
                            }
                        }

                        GroupBox {
                            VStack(spacing: 16) {
                                TextField("you@example.com", text: $email)
                                    .textInputAutocapitalization(.never)
                                    .keyboardType(.emailAddress)
                                    .textContentType(.username)
                                    .autocorrectionDisabled()

                                VStack(alignment: .leading, spacing: 8) {
                                    Group {
                                        if showPassword {
                                            TextField("Password", text: $password)
                                        } else {
                                            SecureField("Password", text: $password)
                                        }
                                    }
                                    .textInputAutocapitalization(.never)
                                    .textContentType(.password)
                                    .autocorrectionDisabled()

                                    Button(showPassword ? "Hide Password" : "Show Password") {
                                        showPassword.toggle()
                                    }
                                    .font(.footnote.weight(.semibold))
                                }
                            }
                            .textFieldStyle(.roundedBorder)
                        } label: {
                            Label("Sign In", systemImage: "person.crop.circle")
                                .font(.headline)
                        }

                        Button {
                            Task {
                                await appModel.login(email: email, password: password)
                            }
                        } label: {
                            HStack {
                                if appModel.isBusy {
                                    ProgressView()
                                        .progressViewStyle(.circular)
                                }
                                Text(appModel.isBusy ? "Signing In..." : "Sign In")
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .disabled(appModel.isBusy || email.isEmpty || password.isEmpty)

                        Text("Use the same SiteFlo login you use on the web.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                    }
                    .frame(maxWidth: 420)
                }
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 20)
                .padding(.vertical, 32)
            }
            .background(Color(.systemGroupedBackground).ignoresSafeArea())
        }
    }
}
