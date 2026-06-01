import SwiftUI
import SwiftData
import PhotosUI

struct CaseDetailView: View {
    let caseId: Int

    @State private var caseDTO: CaseDTO?
    @State private var isLoading = true
    @State private var error: String?
    @State private var showStatusPicker = false
    @State private var showAttachmentPicker = false
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var showEdit = false

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let dto = caseDTO {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Заголовок и статус
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                StatusBadge(status: dto.status)
                                Spacer()
                                Button("Статус") { showStatusPicker = true }
                                    .font(.caption)
                            }
                            Text(dto.title)
                                .font(.title2.bold())

                            if let number = dto.caseNumber {
                                Label(number, systemImage: "number")
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding()
                        .background(.regularMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                        // Детали
                        infoCard

                        // Вложения
                        attachmentsSection(dto: dto)
                    }
                    .padding()
                }
            } else if let error {
                ContentUnavailableView(error, systemImage: "exclamationmark.triangle")
            }
        }
        .navigationTitle("Дело")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Изменить") { showEdit = true }
                    .disabled(caseDTO == nil)
            }
        }
        .sheet(isPresented: $showEdit) {
            if let dto = caseDTO {
                EditCaseView(caseDTO: dto) { updated in
                    caseDTO = updated
                }
            }
        }
        .confirmationDialog("Статус дела", isPresented: $showStatusPicker, titleVisibility: .visible) {
            ForEach(["active", "suspended", "closed", "won", "lost"], id: \.self) { status in
                Button(status.caseStatusLabel) {
                    Task { await changeStatus(to: status) }
                }
            }
        }
        .photosPicker(isPresented: $showAttachmentPicker, selection: $selectedPhoto, matching: .any(of: [.images, .videos]))
        .onChange(of: selectedPhoto) { _, item in
            Task { await uploadPhoto(item) }
        }
        .task { await loadCase() }
    }

    @ViewBuilder
    private var infoCard: some View {
        if let dto = caseDTO {
            VStack(alignment: .leading, spacing: 12) {
                if let category = dto.category {
                    InfoRow(label: "Категория", value: category.categoryLabel, icon: "tag")
                }
                if let court = dto.court {
                    InfoRow(label: "Суд", value: court, icon: "building.columns")
                }
                if let client = dto.client {
                    InfoRow(label: "Клиент", value: client.fullName, icon: "person")
                    if let phone = client.phone {
                        InfoRow(label: "Телефон", value: phone, icon: "phone")
                    }
                }
                if let date = dto.nextHearingDate {
                    InfoRow(
                        label: "Заседание",
                        value: date.formatted(date: .long, time: .shortened),
                        icon: "calendar",
                        valueColor: date < Date() ? .red : .primary
                    )
                }
                if let desc = dto.description {
                    VStack(alignment: .leading, spacing: 4) {
                        Label("Описание", systemImage: "text.alignleft")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(desc)
                            .font(.body)
                    }
                }
            }
            .padding()
            .background(.regularMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    @ViewBuilder
    private func attachmentsSection(dto: CaseDTO) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Вложения (\(dto.attachments.count))", systemImage: "paperclip")
                    .font(.headline)
                Spacer()
                Button(action: { showAttachmentPicker = true }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                }
            }

            if dto.attachments.isEmpty {
                Text("Нет вложений")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            } else {
                ForEach(dto.attachments) { att in
                    AttachmentRowView(attachment: att)
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func loadCase() async {
        isLoading = true
        error = nil
        do {
            caseDTO = try await APIClient.shared.case_(id: caseId)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    private func changeStatus(to status: String) async {
        do {
            caseDTO = try await APIClient.shared.updateCaseStatus(id: caseId, status: status)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func uploadPhoto(_ item: PhotosPickerItem?) async {
        guard let item, let data = try? await item.loadTransferable(type: Data.self) else { return }
        let filename = "\(UUID().uuidString).jpg"
        do {
            _ = try await APIClient.shared.uploadAttachment(
                caseId: caseId, data: data, filename: filename, mimeType: "image/jpeg"
            )
            await loadCase()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct InfoRow: View {
    let label: String
    let value: String
    let icon: String
    var valueColor: Color = .primary

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .frame(width: 20)
                .foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(value)
                    .foregroundStyle(valueColor)
            }
        }
    }
}

struct AttachmentRowView: View {
    let attachment: AttachmentDTO

    var icon: String {
        if attachment.contentType.hasPrefix("image") { return "photo" }
        if attachment.contentType.contains("pdf") { return "doc.richtext" }
        return "doc"
    }

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(.blue)
            VStack(alignment: .leading, spacing: 2) {
                Text(attachment.originalFilename)
                    .font(.subheadline)
                    .lineLimit(1)
                Text(ByteCountFormatter.string(fromByteCount: Int64(attachment.fileSize), countStyle: .file))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text(attachment.createdAt.formatted(date: .abbreviated, time: .omitted))
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}
