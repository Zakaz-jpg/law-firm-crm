import Foundation
import SwiftData

// MARK: - API Response Models (Codable, для сети)

struct CaseDTO: Codable, Identifiable {
    let id: Int
    let title: String
    let caseNumber: String?
    let status: String
    let category: String?
    let court: String?
    let description: String?
    let nextHearingDate: Date?
    let lawyerId: Int
    let clientId: Int?
    let client: ClientDTO?
    let attachments: [AttachmentDTO]
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, title, status, category, court, description, client, attachments
        case caseNumber = "case_number"
        case nextHearingDate = "next_hearing_date"
        case lawyerId = "lawyer_id"
        case clientId = "client_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct ClientDTO: Codable, Identifiable {
    let id: Int
    let fullName: String
    let phone: String?
    let email: String?
    let inn: String?
    let address: String?
    let notes: String?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, phone, email, inn, address, notes
        case fullName = "full_name"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct AttachmentDTO: Codable, Identifiable {
    let id: Int
    let caseId: Int
    let uploadedBy: Int
    let filename: String
    let originalFilename: String
    let contentType: String
    let fileSize: Int
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, filename
        case caseId = "case_id"
        case uploadedBy = "uploaded_by"
        case originalFilename = "original_filename"
        case contentType = "content_type"
        case fileSize = "file_size"
        case createdAt = "created_at"
    }
}

struct TokenResponse: Codable {
    let accessToken: String
    let refreshToken: String

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
    }
}

struct SyncResponse: Codable {
    let syncedAt: Date
    let cases: [CaseDTO]
    let clients: [ClientDTO]

    enum CodingKeys: String, CodingKey {
        case cases, clients
        case syncedAt = "synced_at"
    }
}

// MARK: - SwiftData (офлайн-кэш)

@Model
final class CaseEntity {
    @Attribute(.unique) var id: Int
    var title: String
    var caseNumber: String?
    var status: String
    var category: String?
    var court: String?
    var caseDescription: String?
    var nextHearingDate: Date?
    var clientId: Int?
    var clientName: String?
    var updatedAt: Date

    init(from dto: CaseDTO) {
        self.id = dto.id
        self.title = dto.title
        self.caseNumber = dto.caseNumber
        self.status = dto.status
        self.category = dto.category
        self.court = dto.court
        self.caseDescription = dto.description
        self.nextHearingDate = dto.nextHearingDate
        self.clientId = dto.clientId
        self.clientName = dto.client?.fullName
        self.updatedAt = dto.updatedAt
    }

    func update(from dto: CaseDTO) {
        self.title = dto.title
        self.caseNumber = dto.caseNumber
        self.status = dto.status
        self.category = dto.category
        self.court = dto.court
        self.caseDescription = dto.description
        self.nextHearingDate = dto.nextHearingDate
        self.clientId = dto.clientId
        self.clientName = dto.client?.fullName
        self.updatedAt = dto.updatedAt
    }
}

@Model
final class ClientEntity {
    @Attribute(.unique) var id: Int
    var fullName: String
    var phone: String?
    var email: String?
    var inn: String?
    var updatedAt: Date

    init(from dto: ClientDTO) {
        self.id = dto.id
        self.fullName = dto.fullName
        self.phone = dto.phone
        self.email = dto.email
        self.inn = dto.inn
        self.updatedAt = dto.updatedAt
    }
}

// MARK: - Calendar

struct CalendarEventDTO: Codable, Identifiable {
    let caseId: Int
    let caseNumber: String?
    let title: String
    let court: String?
    let hearingDate: Date

    var id: Int { caseId }

    enum CodingKeys: String, CodingKey {
        case title, court
        case caseId = "case_id"
        case caseNumber = "case_number"
        case hearingDate = "hearing_date"
    }
}

// MARK: - Helpers

extension String {
    var caseStatusLabel: String {
        switch self {
        case "active": return "Активное"
        case "suspended": return "Приостановлено"
        case "closed": return "Закрыто"
        case "won": return "Выиграно"
        case "lost": return "Проиграно"
        default: return self
        }
    }

    var categoryLabel: String {
        switch self {
        case "civil": return "Гражданское"
        case "criminal": return "Уголовное"
        case "administrative": return "Административное"
        case "corporate": return "Корпоративное"
        default: return "Прочее"
        }
    }
}
