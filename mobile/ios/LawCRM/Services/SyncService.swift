import Foundation
import SwiftData

@MainActor
final class SyncService: ObservableObject {
    static let shared = SyncService()

    @Published var isSyncing = false
    @Published var lastSyncedAt: Date? = UserDefaults.standard.object(forKey: "lastSyncedAt") as? Date
    @Published var syncError: String?

    private var modelContext: ModelContext?

    func configure(context: ModelContext) {
        self.modelContext = context
    }

    func syncIfNeeded() async {
        // Синхронизировать если прошло больше 5 минут
        if let last = lastSyncedAt, Date().timeIntervalSince(last) < 300 { return }
        await sync()
    }

    func sync() async {
        guard !isSyncing else { return }
        isSyncing = true
        syncError = nil

        do {
            let response = try await APIClient.shared.sync()
            try await saveToLocal(response)
            lastSyncedAt = response.syncedAt
            UserDefaults.standard.set(response.syncedAt, forKey: "lastSyncedAt")
        } catch APIError.networkError {
            syncError = "Нет интернета — показаны кэшированные данные"
        } catch {
            syncError = error.localizedDescription
        }

        isSyncing = false
    }

    private func saveToLocal(_ response: SyncResponse) async throws {
        guard let context = modelContext else { return }

        // Обновляем дела
        for dto in response.cases {
            let descriptor = FetchDescriptor<CaseEntity>(predicate: #Predicate { $0.id == dto.id })
            if let existing = try? context.fetch(descriptor).first {
                existing.update(from: dto)
            } else {
                context.insert(CaseEntity(from: dto))
            }
        }

        // Обновляем клиентов
        for dto in response.clients {
            let descriptor = FetchDescriptor<ClientEntity>(predicate: #Predicate { $0.id == dto.id })
            if let existing = try? context.fetch(descriptor).first {
                existing.fullName = dto.fullName
                existing.phone = dto.phone
                existing.email = dto.email
                existing.inn = dto.inn
                existing.updatedAt = dto.updatedAt
            } else {
                context.insert(ClientEntity(from: dto))
            }
        }

        try context.save()
    }
}
