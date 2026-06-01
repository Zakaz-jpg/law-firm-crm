import SwiftUI

struct LoginView: View {
    @StateObject private var vm = LoginViewModel()
    @State private var showServerField = false

    var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                Spacer().frame(height: 40)

                // Логотип
                VStack(spacing: 8) {
                    Image(systemName: "scale.3d")
                        .font(.system(size: 64))
                        .foregroundStyle(.blue)
                    Text("LawCRM")
                        .font(.largeTitle.bold())
                    Text("Управление делами")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                // Форма входа
                VStack(spacing: 12) {
                    TextField("Email", text: $vm.email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .padding(12)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    SecureField("Пароль", text: $vm.password)
                        .textContentType(.password)
                        .padding(12)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .padding(.horizontal)

                // Ошибка
                if let error = vm.errorMessage {
                    HStack(spacing: 6) {
                        Image(systemName: "exclamationmark.circle.fill")
                        Text(error)
                            .font(.caption)
                    }
                    .foregroundStyle(.red)
                    .padding(.horizontal)
                    .multilineTextAlignment(.leading)
                }

                // Кнопка входа
                Button(action: { Task { await vm.login() } }) {
                    Group {
                        if vm.isLoading {
                            ProgressView().tint(.white)
                        } else {
                            Text("Войти").fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .padding(.horizontal)
                .disabled(vm.isLoading || vm.email.isEmpty || vm.password.isEmpty)

                // Face ID
                if vm.canUseBiometrics {
                    Button(action: { Task { await vm.loginWithBiometrics() } }) {
                        Label("Face ID / Touch ID", systemImage: "faceid")
                            .font(.subheadline)
                    }
                }

                // URL сервера (скрытая панель)
                VStack(spacing: 8) {
                    Button(action: { withAnimation { showServerField.toggle() } }) {
                        Label(showServerField ? "Скрыть сервер" : "Адрес сервера",
                              systemImage: "network")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if showServerField {
                        VStack(alignment: .leading, spacing: 6) {
                            TextField("https://...", text: $vm.serverURL)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                                .keyboardType(.URL)
                                .font(.caption.monospaced())
                                .padding(10)
                                .background(Color(.secondarySystemBackground))
                                .clipShape(RoundedRectangle(cornerRadius: 8))

                            Text("Текущий: \(APIClient.shared.baseURL)")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                        .padding(.horizontal)
                        .transition(.opacity.combined(with: .move(edge: .top)))
                    }
                }

                Spacer().frame(height: 20)
            }
        }
        .scrollBounceBehavior(.basedOnSize)
    }
}

@MainActor
final class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var serverURL = APIClient.shared.baseURL
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var canUseBiometrics = false

    init() {
        checkBiometrics()
    }

    func login() async {
        // Обновляем URL если изменён
        let trimmed = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            APIClient.shared.baseURL = trimmed
        }

        isLoading = true
        errorMessage = nil
        do {
            let tokens = try await APIClient.shared.login(email: email, password: password)
            AuthManager.shared.save(tokens: tokens)
            UserDefaults.standard.set(email, forKey: "saved_email")
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func loginWithBiometrics() async {
        guard let savedEmail = UserDefaults.standard.string(forKey: "saved_email") else {
            errorMessage = "Сначала войдите с паролем"
            return
        }
        let ok = await AuthManager.shared.authenticateWithBiometrics()
        guard ok else { return }
        if let refresh = AuthManager.shared.refreshToken {
            do {
                let tokens = try await APIClient.shared.refreshToken(refresh)
                AuthManager.shared.save(tokens: tokens)
            } catch {
                email = savedEmail
                errorMessage = "Войдите с паролем"
            }
        }
    }

    private func checkBiometrics() {
        canUseBiometrics = UserDefaults.standard.string(forKey: "saved_email") != nil
    }
}
