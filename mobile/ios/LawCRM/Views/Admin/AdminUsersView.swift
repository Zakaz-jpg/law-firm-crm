import SwiftUI

private let ROLES: [(value: String, label: String)] = [
    ("lawyer",        "Адвокат"),
    ("senior_lawyer", "Старший адвокат"),
    ("jurist",        "Юрист"),
    ("paralegal",     "Помощник"),
    ("admin",         "Администратор"),
    ("viewer",        "Только чтение"),
]

struct AdminUsersView: View {
    @State private var users: [UserDTO] = []
    @State private var loading = true
    @State private var editingUser: UserDTO?
    @State private var error = ""

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if users.isEmpty {
                    ContentUnavailableView("Нет пользователей", systemImage: "person.slash")
                } else {
                    List(users) { user in
                        UserRow(user: user) {
                            editingUser = user
                        }
                    }
                }
            }
            .navigationTitle("Пользователи")
            .sheet(item: $editingUser) { user in
                EditUserSheet(user: user) { updated in
                    users = users.map { $0.id == updated.id ? updated : $0 }
                    editingUser = nil
                }
            }
            .task { await loadUsers() }
        }
    }

    @MainActor
    private func loadUsers() async {
        loading = true
        do { users = try await APIClient.shared.adminUsers() } catch {}
        loading = false
    }
}

private struct UserRow: View {
    let user: UserDTO
    let onEdit: () -> Void

    var roleLabel: String {
        ROLES.first { $0.value == (user.role ?? "") }?.label ?? (user.role ?? "—")
    }

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text(user.fullName)
                    .font(.headline)
                Text(user.email)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(roleLabel)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color(red: 0.1, green: 0.15, blue: 0.27))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color(red: 0.1, green: 0.15, blue: 0.27).opacity(0.1))
                    .clipShape(Capsule())
                if user.isActive == false {
                    Text("Заблокирован")
                        .font(.caption2)
                        .foregroundStyle(.red)
                }
            }
        }
        .contentShape(Rectangle())
        .onTapGesture { onEdit() }
    }
}

private struct EditUserSheet: View {
    let user: UserDTO
    let onSave: (UserDTO) -> Void

    @State private var role: String
    @State private var isActive: Bool
    @State private var saving = false
    @State private var error = ""
    @Environment(\.dismiss) private var dismiss

    init(user: UserDTO, onSave: @escaping (UserDTO) -> Void) {
        self.user = user
        self.onSave = onSave
        _role = State(initialValue: user.role ?? "lawyer")
        _isActive = State(initialValue: user.isActive ?? true)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Пользователь") {
                    LabeledContent("Email", value: user.email)
                    LabeledContent("Имя", value: user.fullName)
                }

                Section("Роль") {
                    Picker("Роль", selection: $role) {
                        ForEach(ROLES, id: \.value) { r in
                            Text(r.label).tag(r.value)
                        }
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                }

                Section("Статус") {
                    Toggle("Активен", isOn: $isActive)
                }

                if !error.isEmpty {
                    Section {
                        Text(error).foregroundStyle(.red).font(.caption)
                    }
                }
            }
            .navigationTitle("Изменить пользователя")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Сохраняю..." : "Сохранить") { save() }
                        .disabled(saving)
                        .fontWeight(.semibold)
                }
            }
        }
    }

    private func save() {
        saving = true
        error = ""
        Task {
            do {
                let updated = try await APIClient.shared.adminUpdateUser(id: user.id, role: role, isActive: isActive)
                await MainActor.run { onSave(updated) }
            } catch let err {
                await MainActor.run { error = err.localizedDescription; saving = false }
            }
        }
    }
}
