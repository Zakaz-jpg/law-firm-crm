import Foundation
import LocalAuthentication

final class AuthManager: ObservableObject {
    static let shared = AuthManager()

    @Published var isLoggedIn: Bool = false

    private let keychainService = "com.lawcrm"
    private let accessKey = "access_token"
    private let refreshKey = "refresh_token"

    var accessToken: String? { keychainRead(key: accessKey) }
    var refreshToken: String? { keychainRead(key: refreshKey) }

    init() {
        isLoggedIn = accessToken != nil
    }

    func save(tokens: TokenResponse) {
        keychainWrite(key: accessKey, value: tokens.accessToken)
        keychainWrite(key: refreshKey, value: tokens.refreshToken)
        DispatchQueue.main.async { self.isLoggedIn = true }
    }

    func logout() {
        keychainDelete(key: accessKey)
        keychainDelete(key: refreshKey)
        DispatchQueue.main.async { self.isLoggedIn = false }
    }

    // Биометрическая аутентификация
    func authenticateWithBiometrics(reason: String = "Вход в LawCRM") async -> Bool {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return false
        }
        do {
            return try await context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason)
        } catch {
            return false
        }
    }

    // MARK: - Keychain

    private func keychainWrite(key: String, value: String) {
        let data = value.data(using: .utf8)!
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: keychainService,
            kSecAttrAccount: key,
        ]
        SecItemDelete(query as CFDictionary)
        var add = query
        add[kSecValueData] = data
        SecItemAdd(add as CFDictionary, nil)
    }

    private func keychainRead(key: String) -> String? {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: keychainService,
            kSecAttrAccount: key,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private func keychainDelete(key: String) {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: keychainService,
            kSecAttrAccount: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
