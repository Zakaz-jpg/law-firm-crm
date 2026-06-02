import SwiftUI

private let ROLES: [(value: String, label: String)] = [
    ("lawyer",        "Адвокат"),
    ("senior_lawyer", "Старший адвокат"),
    ("jurist",        "Юрист"),
    ("paralegal",     "Помощник юриста"),
    ("admin",         "Администратор"),
    ("viewer",        "Только чтение"),
]

struct ProfileView: View {
    @EnvironmentObject private var auth: AuthManager

    @State private var user: UserDTO?
    @State private var loading = true

    // Личные данные
    @State private var fullName = ""
    @State private var role = "lawyer"
    @State private var profileSaving = false
    @State private var profileSuccess = false
    @State private var profileError = ""

    // Смена пароля
    @State private var currentPwd = ""
    @State private var newPwd = ""
    @State private var confirmPwd = ""
    @State private var pwdSaving = false
    @State private var pwdSuccess = false
    @State private var pwdError = ""

    var initials: String {
        (user?.fullName ?? "?")
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first.map(String.init) }
            .joined()
            .uppercased()
    }

    var body: some View {
        NavigationStack {
            if loading {
                ProgressView()
            } else {
                ScrollView {
                    VStack(spacing: 16) {
                        // Аватар
                        VStack(spacing: 8) {
                            ZStack {
                                Circle()
                                    .fill(Color(red: 0.1, green: 0.15, blue: 0.27))
                                    .frame(width: 72, height: 72)
                                Text(initials)
                                    .font(.system(size: 24, weight: .bold, design: .serif))
                                    .foregroundStyle(Color(red: 0.79, green: 0.66, blue: 0.3))
                            }
                            Text(user?.fullName ?? "")
                                .font(.headline)
                            Text(user?.email ?? "")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.top, 8)

                        // Личные данные
                        GroupBox("Личные данные") {
                            VStack(spacing: 12) {
                                TextField("Полное имя", text: $fullName)
                                    .textFieldStyle(.roundedBorder)
                                    .autocorrectionDisabled()

                                Picker("Роль", selection: $role) {
                                    ForEach(ROLES, id: \.value) { r in
                                        Text(r.label).tag(r.value)
                                    }
                                }
                                .pickerStyle(.menu)
                                .frame(maxWidth: .infinity, alignment: .leading)

                                if !profileError.isEmpty {
                                    Text(profileError).font(.caption).foregroundStyle(.red)
                                }
                                if profileSuccess {
                                    Text("Сохранено").font(.caption).foregroundStyle(.green)
                                }

                                Button(profileSaving ? "Сохранение..." : "Сохранить") {
                                    saveProfile()
                                }
                                .buttonStyle(.borderedProminent)
                                .disabled(profileSaving || fullName.isEmpty)
                                .tint(Color(red: 0.1, green: 0.15, blue: 0.27))
                            }
                        }
                        .padding(.horizontal)

                        // Смена пароля
                        GroupBox("Смена пароля") {
                            VStack(spacing: 12) {
                                SecureField("Текущий пароль", text: $currentPwd)
                                    .textFieldStyle(.roundedBorder)
                                SecureField("Новый пароль", text: $newPwd)
                                    .textFieldStyle(.roundedBorder)
                                SecureField("Повторите новый пароль", text: $confirmPwd)
                                    .textFieldStyle(.roundedBorder)

                                if !pwdError.isEmpty {
                                    Text(pwdError).font(.caption).foregroundStyle(.red)
                                }
                                if pwdSuccess {
                                    Text("Пароль изменён").font(.caption).foregroundStyle(.green)
                                }

                                Button(pwdSaving ? "Сохранение..." : "Изменить пароль") {
                                    changePassword()
                                }
                                .buttonStyle(.borderedProminent)
                                .disabled(pwdSaving || currentPwd.isEmpty || newPwd.isEmpty)
                                .tint(Color(red: 0.1, green: 0.15, blue: 0.27))
                            }
                        }
                        .padding(.horizontal)

                        // Выход
                        Button("Выйти", role: .destructive) {
                            auth.logout()
                        }
                        .padding(.top, 8)

                        Spacer(minLength: 32)
                    }
                }
                .navigationTitle("Профиль")
            }
        }
        .task { await loadUser() }
    }

    @MainActor
    private func loadUser() async {
        loading = true
        do {
            let u = try await APIClient.shared.me()
            user = u
            fullName = u.fullName
            role = u.role ?? "lawyer"
        } catch {}
        loading = false
    }

    private func saveProfile() {
        profileError = ""
        profileSuccess = false
        profileSaving = true
        Task {
            do {
                let updated = try await APIClient.shared.updateProfile(fullName: fullName, role: role)
                await MainActor.run {
                    user = updated
                    profileSuccess = true
                    profileSaving = false
                }
            } catch {
                await MainActor.run {
                    profileError = error.localizedDescription
                    profileSaving = false
                }
            }
        }
    }

    private func changePassword() {
        pwdError = ""
        pwdSuccess = false
        guard newPwd == confirmPwd else { pwdError = "Пароли не совпадают"; return }
        guard newPwd.count >= 6 else { pwdError = "Минимум 6 символов"; return }
        pwdSaving = true
        Task {
            do {
                try await APIClient.shared.changePassword(current: currentPwd, new: newPwd)
                await MainActor.run {
                    pwdSuccess = true
                    currentPwd = ""; newPwd = ""; confirmPwd = ""
                    pwdSaving = false
                }
            } catch {
                await MainActor.run {
                    pwdError = error.localizedDescription
                    pwdSaving = false
                }
            }
        }
    }
}
