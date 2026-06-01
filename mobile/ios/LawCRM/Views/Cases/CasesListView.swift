import SwiftUI
import SwiftData

struct CasesListView: View {
    @Query(sort: \CaseEntity.updatedAt, order: .reverse) private var cases: [CaseEntity]
    @StateObject private var vm = CasesListViewModel()
    @StateObject private var sync = SyncService.shared
    @Environment(\.modelContext) private var context

    var body: some View {
        NavigationStack {
            Group {
                if cases.isEmpty && sync.isSyncing {
                    ProgressView("Загрузка дел...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if cases.isEmpty && sync.syncError != nil {
                    VStack(spacing: 16) {
                        Image(systemName: "wifi.exclamationmark")
                            .font(.system(size: 48))
                            .foregroundStyle(.orange)
                        Text(sync.syncError!)
                            .multilineTextAlignment(.center)
                            .foregroundStyle(.secondary)
                        Button("Повторить") { Task { await sync.sync() } }
                            .buttonStyle(.borderedProminent)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if cases.isEmpty {
                    ContentUnavailableView(
                        "Нет дел",
                        systemImage: "folder.badge.plus",
                        description: Text("Нажмите + чтобы добавить первое дело")
                    )
                } else {
                    casesList
                }
            }
            .navigationTitle("Мои дела")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: { vm.showCreate = true }) {
                        Image(systemName: "plus")
                    }
                }
                ToolbarItem(placement: .topBarLeading) {
                    if sync.isSyncing {
                        ProgressView().scaleEffect(0.7)
                    } else {
                        Button(action: { Task { await sync.sync() } }) {
                            Image(systemName: "arrow.clockwise")
                        }
                    }
                }
            }
            .searchable(text: $vm.searchText, prompt: "Поиск по делам")
            .sheet(isPresented: $vm.showCreate) {
                CreateCaseView()
            }
            .task {
                sync.configure(context: context)
                await sync.syncIfNeeded()
            }
        }
    }

    private var casesList: some View {
        List {
            if let error = sync.syncError {
                Label(error, systemImage: "wifi.exclamationmark")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }

            // Фильтрация по статусу
            ForEach(["", "active", "suspended", "closed", "won", "lost"], id: \.self) { status in
                let filtered = filteredCases(status: status)
                if !filtered.isEmpty {
                    Section(status.isEmpty ? "Все" : status.caseStatusLabel) {
                        ForEach(filtered) { cas in
                            NavigationLink(destination: CaseDetailView(caseId: cas.id)) {
                                CaseRowView(cas: cas)
                            }
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .refreshable { await sync.sync() }
    }

    private func filteredCases(status: String) -> [CaseEntity] {
        let search = vm.searchText.lowercased()
        return cases.filter { cas in
            (status.isEmpty || cas.status == status) &&
            (search.isEmpty || cas.title.lowercased().contains(search))
        }
    }
}

struct CaseRowView: View {
    let cas: CaseEntity

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(cas.title)
                    .font(.headline)
                    .lineLimit(1)
                Spacer()
                StatusBadge(status: cas.status)
            }
            if let number = cas.caseNumber {
                Text(number)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if let client = cas.clientName {
                Label(client, systemImage: "person")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if let hearing = cas.nextHearingDate {
                Label(hearing.formatted(date: .abbreviated, time: .shortened), systemImage: "calendar")
                    .font(.caption)
                    .foregroundStyle(hearing < Date() ? .red : .secondary)
            }
        }
        .padding(.vertical, 2)
    }
}

struct StatusBadge: View {
    let status: String

    var color: Color {
        switch status {
        case "active": return .green
        case "suspended": return .orange
        case "closed": return .gray
        case "won": return .blue
        case "lost": return .red
        default: return .gray
        }
    }

    var body: some View {
        Text(status.caseStatusLabel)
            .font(.caption2.bold())
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .clipShape(Capsule())
    }
}

@MainActor
final class CasesListViewModel: ObservableObject {
    @Published var searchText = ""
    @Published var showCreate = false
}
