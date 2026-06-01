import SwiftUI
import SwiftData

struct DashboardView: View {
    @Query private var cases: [CaseEntity]
    @Query private var clients: [ClientEntity]
    @ObservedObject private var sync = SyncService.shared
    @Environment(\.modelContext) private var context

    private let now = Date()

    private var active: Int { cases.filter { $0.status == "active" }.count }
    private var won: Int    { cases.filter { $0.status == "won" }.count }
    private var lost: Int   { cases.filter { $0.status == "lost" }.count }

    private var upcoming: [CaseEntity] {
        cases
            .filter { $0.nextHearingDate != nil && $0.nextHearingDate! >= now }
            .sorted { $0.nextHearingDate! < $1.nextHearingDate! }
            .prefix(5).map { $0 }
    }

    private var overdue: [CaseEntity] {
        cases.filter {
            $0.status == "active" &&
            $0.nextHearingDate != nil &&
            $0.nextHearingDate! < now
        }
    }

    private var greeting: String {
        let h = Calendar.current.component(.hour, from: now)
        if h < 12 { return "Доброе утро" }
        if h < 18 { return "Добрый день" }
        return "Добрый вечер"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Приветствие
                    VStack(alignment: .leading, spacing: 4) {
                        Text(greeting)
                            .font(.title.bold())
                        Text(now.formatted(.dateTime.weekday(.wide).day().month(.wide)))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal)

                    // Статистика
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        StatCard(label: "Всего дел", value: cases.count, color: .indigo)
                        StatCard(label: "Активных", value: active, color: .green)
                        StatCard(label: "Выиграно", value: won, color: .blue)
                        StatCard(label: "Клиентов", value: clients.count, color: .orange)
                    }
                    .padding(.horizontal)

                    // Просроченные заседания
                    if !overdue.isEmpty {
                        SectionBlock(title: "Просроченные заседания (\(overdue.count))", accent: true) {
                            ForEach(overdue) { cas in
                                NavigationLink(destination: CaseDetailView(caseId: cas.id)) {
                                    DashCaseRow(cas: cas, overdue: true)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    // Ближайшие заседания
                    SectionBlock(title: "Ближайшие заседания") {
                        if upcoming.isEmpty {
                            Text("Нет запланированных заседаний")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .padding(.vertical, 8)
                        } else {
                            ForEach(upcoming) { cas in
                                NavigationLink(destination: CaseDetailView(caseId: cas.id)) {
                                    DashCaseRow(cas: cas)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    // Активные дела
                    SectionBlock(title: "Активные дела") {
                        let activeCases = cases.filter { $0.status == "active" }.prefix(8)
                        if activeCases.isEmpty {
                            Text("Нет активных дел")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .padding(.vertical, 8)
                        } else {
                            ForEach(Array(activeCases)) { cas in
                                NavigationLink(destination: CaseDetailView(caseId: cas.id)) {
                                    DashCaseRow(cas: cas)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Дашборд")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if sync.isSyncing {
                        ProgressView().scaleEffect(0.7)
                    } else {
                        Button(action: { Task { await sync.sync() } }) {
                            Image(systemName: "arrow.clockwise")
                        }
                    }
                }
            }
            .task {
                sync.configure(context: context)
                await sync.syncIfNeeded()
            }
        }
    }
}

private struct StatCard: View {
    let label: String
    let value: Int
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            Text("\(value)")
                .font(.system(size: 36, weight: .bold))
                .foregroundStyle(color)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

private struct SectionBlock<Content: View>: View {
    let title: String
    var accent: Bool = false
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                if accent {
                    Circle().fill(.red).frame(width: 8, height: 8)
                }
                Text(title)
                    .font(.headline)
            }
            .padding(.horizontal)

            VStack(spacing: 0) {
                content()
            }
            .padding(.horizontal)
            .background(.regularMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .padding(.horizontal)
        }
    }
}

private struct DashCaseRow: View {
    let cas: CaseEntity
    var overdue: Bool = false

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text(cas.title)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                HStack(spacing: 8) {
                    if let client = cas.clientName {
                        Text(client)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let date = cas.nextHearingDate {
                        Text(date.formatted(date: .abbreviated, time: .shortened))
                            .font(.caption)
                            .foregroundStyle(overdue ? .red : .secondary)
                    }
                }
            }
            Spacer()
            StatusBadge(status: cas.status)
        }
        .padding(.vertical, 10)
        Divider()
    }
}
