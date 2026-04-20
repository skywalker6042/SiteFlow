import SwiftUI

struct LoginView: View {
    @Environment(AppModel.self) private var appModel

    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false

    var body: some View {
        ZStack {
            SiteFlowPalette.background.ignoresSafeArea()

            VStack(spacing: 24) {
                VStack(spacing: 14) {
                    Image("Logo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 72, height: 72)

                    VStack(spacing: 6) {
                        Text("SiteFlo")
                            .font(.system(size: 34, weight: .bold))
                            .foregroundStyle(SiteFlowPalette.ink)

                        Rectangle()
                            .fill(SiteFlowPalette.teal)
                            .frame(width: 36, height: 3)
                            .clipShape(Capsule())

                        Text("Sign in to your contractor workspace")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(SiteFlowPalette.slate)
                    }
                }

                SiteFlowCard {
                    Text("Sign In")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(SiteFlowPalette.ink)


                    VStack(alignment: .leading, spacing: 8) {
                        Text("Email")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(SiteFlowPalette.slate)
                        TextField("you@example.com", text: $email)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.emailAddress)
                            .autocorrectionDisabled()
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(Color.white)
                            .overlay(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(SiteFlowPalette.border, lineWidth: 1)
                            )
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Password")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(SiteFlowPalette.slate)

                        HStack {
                            Group {
                                if showPassword {
                                    TextField("Password", text: $password)
                                } else {
                                    SecureField("Password", text: $password)
                                }
                            }
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()

                            Button(showPassword ? "Hide" : "Show") {
                                showPassword.toggle()
                            }
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(SiteFlowPalette.slate)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .background(Color.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(SiteFlowPalette.border, lineWidth: 1)
                        )
                    }

                    if let errorMessage = appModel.errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(SiteFlowPalette.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(12)
                            .background(SiteFlowPalette.red.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
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
                                    .tint(.white)
                            }
                            Text(appModel.isBusy ? "Signing In..." : "Sign In")
                                .font(.system(size: 15, weight: .semibold))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .foregroundStyle(.white)
                        .background(SiteFlowPalette.teal)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .disabled(appModel.isBusy)
                }
                .padding(.horizontal, 20)

                Text("Use the same SiteFlo login you use on the web.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(SiteFlowPalette.slate)
            }
            .frame(maxWidth: 420)
            .padding(20)
        }
    }
}
