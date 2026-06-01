import SwiftUI
import SwiftData
import UserNotifications

@main
struct LawCRMApp: App {
    let container: ModelContainer
    @StateObject private var auth: AuthManager

    init() {
        _auth = StateObject(wrappedValue: AuthManager.shared)

        // Создаём контейнер с fallback на in-memory если диск недоступен
        let schema = Schema([CaseEntity.self, ClientEntity.self])
        do {
            container = try ModelContainer(for: schema)
        } catch {
            let cfg = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
            container = try! ModelContainer(for: schema, configurations: [cfg])
        }

        UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .badge, .sound]) { _, _ in }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(auth)
        }
        .modelContainer(container)
    }
}

struct ContentView: View {
    @EnvironmentObject private var auth: AuthManager

    var body: some View {
        Group {
            if auth.isLoggedIn {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .animation(.default, value: auth.isLoggedIn)
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem { Label("Дашборд", systemImage: "chart.bar") }

            CasesListView()
                .tabItem { Label("Дела", systemImage: "folder") }

            ClientsListView()
                .tabItem { Label("Клиенты", systemImage: "person.2") }

            SettingsView()
                .tabItem { Label("Настройки", systemImage: "gear") }
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject private var auth: AuthManager
    @ObservedObject private var sync = SyncService.shared

    var body: some View {
        NavigationStack {
            List {
                Section("Синхронизация") {
                    Button(action: { Task { await sync.sync() } }) {
                        Label(sync.isSyncing ? "Синхронизация..." : "Синхронизировать",
                              systemImage: "arrow.clockwise")
                    }
                    .disabled(sync.isSyncing)

                    if let last = sync.lastSyncedAt {
                        LabeledContent("Последняя синх.",
                            value: last.formatted(date: .abbreviated, time: .shortened))
                    }

                    if let err = sync.syncError {
                        Label(err, systemImage: "wifi.exclamationmark")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                }

                Section("Сервер") {
                    TextField("http://127.0.0.1:8000/api/v1", text: Binding(
                        get: { APIClient.shared.baseURL },
                        set: { APIClient.shared.baseURL = $0 }
                    ))
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .keyboardType(.URL)
                }

                Section {
                    Button("Выйти", role: .destructive) {
                        auth.logout()
                    }
                }
            }
            .navigationTitle("Настройки")
        }
    }
}
