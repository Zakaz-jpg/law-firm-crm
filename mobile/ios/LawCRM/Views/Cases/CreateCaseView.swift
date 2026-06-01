import SwiftUI

struct CreateCaseView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = CreateCaseViewModel()

    var body: some View {
        NavigationStack {
            Form {
                Section("Основное") {
                    TextField("Название дела *", text: $vm.title)
                    TextField("Номер дела", text: $vm.caseNumber)
                }

                Section("Категория") {
                    Picker("Категория", selection: $vm.category) {
                        Text("Не выбрана").tag("")
                        Text("Гражданское").tag("civil")
                        Text("Уголовное").tag("criminal")
                        Text("Административное").tag("administrative")
                        Text("Корпоративное").tag("corporate")
                        Text("Прочее").tag("other")
                    }
                }

                Section("Клиент") {
                    if let client = vm.selectedClient {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(client.fullName).font(.subheadline)
                                if let phone = client.phone {
                                    Text(phone).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                            Button("Изменить") { vm.showClientPicker = true }
                                .font(.caption)
                            Button(role: .destructive) { vm.selectedClient = nil } label: {
                                Image(systemName: "xmark.circle.fill").foregroundStyle(.red)
                            }
                        }
                    } else {
                        Button("Выбрать клиента") { vm.showClientPicker = true }
                    }
                }

                if let error = vm.errorMessage {
                    Section { Text(error).foregroundStyle(.red) }
                }
            }
            .navigationTitle("Новое дело")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if vm.isLoading {
                        ProgressView()
                    } else {
                        Button("Создать") {
                            Task { if await vm.create() { dismiss() } }
                        }
                        .disabled(vm.title.isEmpty)
                    }
                }
            }
            .sheet(isPresented: $vm.showClientPicker) {
                ClientPickerView(selected: $vm.selectedClient)
            }
        }
    }
}

@MainActor
final class CreateCaseViewModel: ObservableObject {
    @Published var title = ""
    @Published var caseNumber = ""
    @Published var category = ""
    @Published var selectedClient: ClientDTO?
    @Published var showClientPicker = false
    @Published var isLoading = false
    @Published var errorMessage: String?

    func create() async -> Bool {
        isLoading = true
        errorMessage = nil
        do {
            _ = try await APIClient.shared.createCase(
                title: title,
                caseNumber: caseNumber.isEmpty ? nil : caseNumber,
                category: category.isEmpty ? nil : category,
                clientId: selectedClient?.id
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
