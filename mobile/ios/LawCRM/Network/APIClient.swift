import Foundation

enum APIError: LocalizedError {
    case unauthorized
    case notFound
    case serverError(String)
    case networkError

    var errorDescription: String? {
        switch self {
        case .unauthorized: return "Сессия истекла. Войдите снова."
        case .notFound: return "Не найдено."
        case .serverError(let msg): return msg
        case .networkError: return "Нет подключения к интернету."
        }
    }
}

final class APIClient {
    static let shared = APIClient()

    var baseURL = "https://lawcrm-api.onrender.com/api/v1"

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        let fmt = ISO8601DateFormatter()
        fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        d.dateDecodingStrategy = .custom { decoder in
            let s = try decoder.singleValueContainer().decode(String.self)
            if let date = fmt.date(from: s) { return date }
            throw DecodingError.dataCorruptedError(in: try decoder.singleValueContainer(),
                debugDescription: "Invalid date: \(s)")
        }
        return d
    }()

    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
    }()

    // MARK: - Auth

    func login(email: String, password: String) async throws -> TokenResponse {
        var req = request(path: "/auth/login", method: "POST")
        let body = "username=\(email)&password=\(password)"
        req.httpBody = body.data(using: .utf8)
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        return try await perform(req)
    }

    func refreshToken(_ refreshToken: String) async throws -> TokenResponse {
        var req = request(path: "/auth/refresh", method: "POST")
        req.httpBody = try encoder.encode(["refresh_token": refreshToken])
        return try await perform(req)
    }

    func registerDeviceToken(_ deviceToken: String, platform: String = "ios") async throws {
        var req = authedRequest(path: "/auth/device-token", method: "POST")
        req.httpBody = try encoder.encode(["token": deviceToken, "platform": platform])
        _ = try await performRaw(req)
    }

    // MARK: - Cases

    func cases(status: String? = nil, query: String? = nil, clientId: Int? = nil) async throws -> [CaseDTO] {
        var path = "/cases"
        var params: [String] = []
        if let s = status { params.append("status=\(s)") }
        if let q = query { params.append("q=\(q.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? q)") }
        if let cId = clientId { params.append("client_id=\(cId)") }
        if !params.isEmpty { path += "?" + params.joined(separator: "&") }
        return try await perform(authedRequest(path: path))
    }

    func updateCase(id: Int, title: String? = nil, caseNumber: String? = nil,
                    category: String? = nil, court: String? = nil,
                    description: String? = nil, nextHearingDate: Date? = nil,
                    clientId: Int? = nil, clearClientId: Bool = false) async throws -> CaseDTO {
        var req = authedRequest(path: "/cases/\(id)", method: "PATCH")
        var body: [String: Any] = [:]
        if let v = title { body["title"] = v }
        if let v = caseNumber { body["case_number"] = v }
        if let v = category { body["category"] = v }
        if let v = court { body["court"] = v }
        if let v = description { body["description"] = v }
        if clearClientId { body["client_id"] = NSNull() }
        else if let v = clientId { body["client_id"] = v }
        if let v = nextHearingDate {
            let fmt = ISO8601DateFormatter()
            fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            body["next_hearing_date"] = fmt.string(from: v)
        }
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        return try await perform(req)
    }

    func case_(id: Int) async throws -> CaseDTO {
        return try await perform(authedRequest(path: "/cases/\(id)"))
    }

    func createCase(title: String, caseNumber: String?, category: String?, clientId: Int?) async throws -> CaseDTO {
        var req = authedRequest(path: "/cases", method: "POST")
        let body: [String: Any?] = [
            "title": title, "case_number": caseNumber,
            "category": category, "client_id": clientId
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: body.compactMapValues { $0 })
        return try await perform(req)
    }

    func updateCaseStatus(id: Int, status: String) async throws -> CaseDTO {
        var req = authedRequest(path: "/cases/\(id)/status", method: "PATCH")
        req.httpBody = try encoder.encode(["status": status])
        return try await perform(req)
    }

    // MARK: - Clients

    func clients(query: String? = nil) async throws -> [ClientDTO] {
        var path = "/clients"
        if let q = query { path += "?q=\(q.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? q)" }
        return try await perform(authedRequest(path: path))
    }

    func getClient(id: Int) async throws -> ClientDTO {
        return try await perform(authedRequest(path: "/clients/\(id)"))
    }

    func createClient(fullName: String, phone: String?, email: String?, inn: String?) async throws -> ClientDTO {
        var req = authedRequest(path: "/clients", method: "POST")
        let body: [String: Any?] = ["full_name": fullName, "phone": phone, "email": email, "inn": inn]
        req.httpBody = try JSONSerialization.data(withJSONObject: body.compactMapValues { $0 })
        return try await perform(req)
    }

    // MARK: - Attachments

    func uploadAttachment(caseId: Int, data: Data, filename: String, mimeType: String) async throws -> AttachmentDTO {
        var req = authedRequest(path: "/cases/\(caseId)/attachments", method: "POST")
        let boundary = UUID().uuidString
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body
        return try await perform(req)
    }

    // MARK: - Sync

    func sync() async throws -> SyncResponse {
        return try await perform(authedRequest(path: "/sync"))
    }

    // MARK: - Private helpers

    private func request(path: String, method: String = "GET") -> URLRequest {
        var req = URLRequest(url: URL(string: baseURL + path)!)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("true", forHTTPHeaderField: "bypass-tunnel-reminder")
        return req
    }

    private func authedRequest(path: String, method: String = "GET") -> URLRequest {
        var req = request(path: path, method: method)
        if let token = AuthManager.shared.accessToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return req
    }

    private func perform<T: Decodable>(_ req: URLRequest) async throws -> T {
        let data = try await performRaw(req)
        return try decoder.decode(T.self, from: data)
    }

    private func performRaw(_ req: URLRequest) async throws -> Data {
        do {
            let (data, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse else { throw APIError.networkError }

            switch http.statusCode {
            case 200...299: return data
            case 401:
                // Попытка обновить токен и повторить
                if req.url?.path.contains("/auth/") == false,
                   let refresh = AuthManager.shared.refreshToken {
                    let tokens = try await self.refreshToken(refresh)
                    AuthManager.shared.save(tokens: tokens)
                    var retried = req
                    retried.setValue("Bearer \(tokens.accessToken)", forHTTPHeaderField: "Authorization")
                    let (retryData, _) = try await URLSession.shared.data(for: retried)
                    return retryData
                }
                throw APIError.unauthorized
            case 404: throw APIError.notFound
            default:
                let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["detail"] ?? "Ошибка сервера"
                throw APIError.serverError(msg)
            }
        } catch let error as APIError {
            throw error
        } catch let urlError as URLError {
            print("❌ URLError \(urlError.code.rawValue): \(urlError.localizedDescription)")
            switch urlError.code {
            case .notConnectedToInternet, .networkConnectionLost, .cannotFindHost, .cannotConnectToHost:
                throw APIError.networkError
            case .appTransportSecurityRequiresSecureConnection:
                throw APIError.serverError("ATS блокирует HTTP. Проверь Info.plist")
            default:
                throw APIError.serverError("Сетевая ошибка (\(urlError.code.rawValue)): \(urlError.localizedDescription)")
            }
        } catch {
            print("❌ Неизвестная ошибка: \(error)")
            throw APIError.serverError("Ошибка: \(error.localizedDescription)")
        }
    }
}
