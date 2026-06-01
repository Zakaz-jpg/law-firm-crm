import SwiftUI
import SwiftData

struct ClientsListView: View {
    @Query(sort: \ClientEntity.fullName) private var clients: [ClientEntity]
    @State private var searchText = ""
    @State private var showCreate = false

    var filtered: [ClientEntity] {
        guard !searchText.isEmpty else { return clients }
        return clients.filter { $0.fullName.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if clients.isEmpty {
                    ContentUnavailableView(
                        "Нет клиентов",
                        systemImage: "person.crop.circle.badge.plus",
                        description: Text("Нажмите + чтобы добавить клиента")
                    )
                } else {
                    List(filtered) { client in
                        ClientRowView(client: client)
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Клиенты")
            .searchable(text: $searchText, prompt: "Поиск клиента")
            .toolbar {
                Button(action: { showCreate = true }) {
                    Image(systemName: "plus")
                }
            }
            .sheet(isPresented: $showCreate) {
                CreateClientView()
            }
        }
    }
}

struct ClientRowView: View {
    let client: ClientEntity

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(client.fullName)
                .font(.headline)
            if let phone = client.phone {
                Label(phone, systemImage: "phone")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if let inn = client.inn {
                Label("ИНН: \(inn)", systemImage: "doc.text")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }
}

struct CreateClientView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = CreateClientViewModel()

    var body: some View {
        NavigationStack {
            Form {
                Section("Обязательное") {
                    TextField("ФИО или название организации *", text: $vm.fullName)
                }
                Section("Контакты") {
                    TextField("Телефон", text: $vm.phone)
                        .keyboardType(.phonePad)
                    TextField("Email", text: $vm.email)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                }
                Section("Реквизиты") {
                    TextField("ИНН", text: $vm.inn)
                        .keyboardType(.numberPad)
                }
                if let error = vm.errorMessage {
                    Section { Text(error).foregroundStyle(.red) }
                }
            }
            .navigationTitle("Новый клиент")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Отмена") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Создать") {
                        Task { if await vm.create() { dismiss() } }
                    }
                    .disabled(vm.fullName.isEmpty || vm.isLoading)
                }
            }
        }
    }
}

@MainActor
final class CreateClientViewModel: ObservableObject {
    @Published var fullName = ""
    @Published var phone = ""
    @Published var email = ""
    @Published var inn = ""
    @Published var isLoading = false
    @Published var errorMessage: String?

    func create() async -> Bool {
        isLoading = true
        do {
            _ = try await APIClient.shared.createClient(
                fullName: fullName,
                phone: phone.isEmpty ? nil : phone,
                email: email.isEmpty ? nil : email,
                inn: inn.isEmpty ? nil : inn
            )
            await SyncService.shared.sync()
            isLoading = false
            return true
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
            return false
        }
    }
}
