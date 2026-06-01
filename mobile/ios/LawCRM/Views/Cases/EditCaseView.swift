import SwiftUI

struct EditCaseView: View {
    let caseDTO: CaseDTO
    var onSaved: (CaseDTO) -> Void

    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm: EditCaseViewModel

    init(caseDTO: CaseDTO, onSaved: @escaping (CaseDTO) -> Void) {
        self.caseDTO = caseDTO
        self.onSaved = onSaved
        _vm = StateObject(wrappedValue: EditCaseViewModel(dto: caseDTO))
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Основное") {
                    TextField("Название дела", text: $vm.title)
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

                Section("Суд") {
                    TextField("Наименование суда", text: $vm.court)
                }

                Section("Заседание") {
                    Toggle("Указать дату заседания", isOn: $vm.hasHearingDate)
                    if vm.hasHearingDate {
                        DatePicker("Дата и время",
                                   selection: $vm.hearingDate,
                                   displayedComponents: [.date, .hourAndMinute])
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
                            Button(role: .destructive) { vm.selectedClient = nil }
                            label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.red) }
                        }
                    } else {
                        Button("Выбрать клиента") { vm.showClientPicker = true }
                    }
                }

                Section("Описание") {
                    TextField("Описание дела", text: $vm.description, axis: .vertical)
                        .lineLimit(4...8)
                }

                if let error = vm.errorMessage {
                    Section { Text(error).foregroundStyle(.red) }
                }
            }
            .navigationTitle("Редактировать дело")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if vm.isLoading {
                        ProgressView()
                    } else {
                        Button("Сохранить") {
                            Task {
                                if let updated = await vm.save(originalId: caseDTO.id) {
                                    onSaved(updated)
                                    dismiss()
                                }
                            }
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
final class EditCaseViewModel: ObservableObject {
    @Published var title: String
    @Published var caseNumber: String
    @Published var category: String
    @Published var court: String
    @Published var description: String
    @Published var hasHearingDate: Bool
    @Published var hearingDate: Date
    @Published var selectedClient: ClientDTO?
    @Published var showClientPicker = false
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let originalClientId: Int?

    init(dto: CaseDTO) {
        title = dto.title
        caseNumber = dto.caseNumber ?? ""
        category = dto.category ?? ""
        court = dto.court ?? ""
        description = dto.description ?? ""
        hasHearingDate = dto.nextHearingDate != nil
        hearingDate = dto.nextHearingDate ?? Date()
        selectedClient = dto.client
        originalClientId = dto.clientId
    }

    func save(originalId: Int) async -> CaseDTO? {
        isLoading = true
        errorMessage = nil
        do {
            let updated = try await APIClient.shared.updateCase(
                id: originalId,
                title: title,
                caseNumber: caseNumber.isEmpty ? nil : caseNumber,
                category: category.isEmpty ? nil : category,
                court: court.isEmpty ? nil : court,
                description: description.isEmpty ? nil : description,
                nextHearingDate: hasHearingDate ? hearingDate : nil,
                clientId: selectedClient?.id,
                clearClientId: selectedClient == nil && originalClientId != nil
            )
            await SyncService.shared.sync()
            isLoading = false
            return updated
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
            return nil
        }
    }
}

// MARK: - Client Picker

struct ClientPickerView: View {
    @Binding var selected: ClientDTO?
    @Environment(\.dismiss) private var dismiss
    @State private var clients: [ClientDTO] = []
    @State private var searchText = ""
    @State private var isLoading = true

    var filtered: [ClientDTO] {
        guard !searchText.isEmpty else { return clients }
        return clients.filter { $0.fullName.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if clients.isEmpty {
                    ContentUnavailableView("Нет клиентов", systemImage: "person.slash")
                } else {
                    List(filtered) { client in
                        Button {
                            selected = client
                            dismiss()
                        } label: {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(client.fullName).font(.subheadline)
                                if let phone = client.phone {
                                    Text(phone).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                            .foregroundStyle(.primary)
                        }
                    }
                }
            }
            .navigationTitle("Выбор клиента")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "Поиск клиента")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
            }
            .task {
                clients = (try? await APIClient.shared.clients()) ?? []
                isLoading = false
            }
        }
    }
}
