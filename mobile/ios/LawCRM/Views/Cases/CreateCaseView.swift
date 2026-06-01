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
                    TextField("Имя клиента (необязательно)", text: $vm.clientName)
                }

                if let error = vm.errorMessage {
                    Section {
                        Text(error).foregroundStyle(.red)
                    }
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
                            Task {
                                if await vm.create() { dismiss() }
                            }
                        }
                        .disabled(vm.title.isEmpty)
                    }
                }
            }
        }
    }
}

@MainActor
final class CreateCaseViewModel: ObservableObject {
    @Published var title = ""
    @Published var caseNumber = ""
    @Published var category = ""
    @Published var clientName = ""
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
                clientId: nil
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
