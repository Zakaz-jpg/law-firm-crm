import SwiftUI

struct ClientDetailView: View {
    let clientId: Int

    @State private var client: ClientDTO?
    @State private var cases: [CaseDTO] = []
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let client {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        profileCard(client: client)
                        statsCard(client: client)
                        casesSection
                    }
                    .padding()
                }
            } else if let error {
                ContentUnavailableView(error, systemImage: "exclamationmark.triangle")
            }
        }
        .navigationTitle("Клиент")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func profileCard(client: ClientDTO) -> some View {
        HStack(spacing: 16) {
            // Аватар с инициалами
            let initials = client.fullName.split(separator: " ")
                .prefix(2).compactMap { $0.first }.map { String($0) }.joined().uppercased()
            Circle()
                .fill(Color.indigo.gradient)
                .frame(width: 56, height: 56)
                .overlay(
                    Text(initials)
                        .font(.title3.bold())
                        .foregroundStyle(.white)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(client.fullName)
                    .font(.title3.bold())
                if let phone = client.phone {
                    Label(phone, systemImage: "phone")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                if let email = client.email {
                    Label(email, systemImage: "envelope")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                if let inn = client.inn {
                    Label("ИНН: \(inn)", systemImage: "doc.text")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if let address = client.address {
                    Label(address, systemImage: "mappin")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func statsCard(client: ClientDTO) -> some View {
        HStack {
            StatItem(label: "Всего дел", value: cases.count, color: .indigo)
            Divider().frame(height: 40)
            StatItem(label: "Активных", value: cases.filter { $0.status == "active" }.count, color: .green)
            Divider().frame(height: 40)
            StatItem(label: "Выиграно", value: cases.filter { $0.status == "won" }.count, color: .blue)
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private var casesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("История дел")
                .font(.headline)

            if cases.isEmpty {
                Text("У клиента нет дел")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
                    .background(.regularMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            } else {
                VStack(spacing: 0) {
                    ForEach(cases) { cas in
                        NavigationLink(destination: CaseDetailView(caseId: cas.id)) {
                            ClientCaseRow(cas: cas)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
                .background(.regularMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func load() async {
        isLoading = true
        error = nil
        do {
            async let c = APIClient.shared.getClient(id: clientId)
            async let cs = APIClient.shared.cases(clientId: clientId)
            let (clientResult, casesResult) = try await (c, cs)
            client = clientResult
            cases = casesResult
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

private struct StatItem: View {
    let label: String
    let value: Int
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.title2.bold())
                .foregroundStyle(color)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct ClientCaseRow: View {
    let cas: CaseDTO

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text(cas.title)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                    .foregroundStyle(.primary)
                HStack(spacing: 8) {
                    if let number = cas.caseNumber {
                        Text("№ \(number)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let category = cas.category {
                        Text(category.categoryLabel)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let date = cas.nextHearingDate {
                        Text(date.formatted(date: .abbreviated, time: .omitted))
                            .font(.caption)
                            .foregroundStyle(date < Date() ? .red : .secondary)
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
