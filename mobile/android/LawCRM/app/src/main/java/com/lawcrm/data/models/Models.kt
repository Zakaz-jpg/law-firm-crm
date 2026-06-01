package com.lawcrm.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.gson.annotations.SerializedName
import java.util.Date

// ── API Response DTOs ─────────────────────────────────────────────────────────

data class CaseDTO(
    val id: Int,
    val title: String,
    @SerializedName("case_number") val caseNumber: String?,
    val status: String,
    val category: String?,
    val court: String?,
    val description: String?,
    @SerializedName("next_hearing_date") val nextHearingDate: Date?,
    @SerializedName("lawyer_id") val lawyerId: Int,
    @SerializedName("client_id") val clientId: Int?,
    val client: ClientDTO?,
    val attachments: List<AttachmentDTO>,
    @SerializedName("created_at") val createdAt: Date,
    @SerializedName("updated_at") val updatedAt: Date,
)

data class ClientDTO(
    val id: Int,
    @SerializedName("full_name") val fullName: String,
    val phone: String?,
    val email: String?,
    val inn: String?,
    val address: String?,
    val notes: String?,
    @SerializedName("created_at") val createdAt: Date,
    @SerializedName("updated_at") val updatedAt: Date,
)

data class AttachmentDTO(
    val id: Int,
    @SerializedName("case_id") val caseId: Int,
    @SerializedName("uploaded_by") val uploadedBy: Int,
    val filename: String,
    @SerializedName("original_filename") val originalFilename: String,
    @SerializedName("content_type") val contentType: String,
    @SerializedName("file_size") val fileSize: Long,
    @SerializedName("created_at") val createdAt: Date,
)

data class TokenResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("refresh_token") val refreshToken: String,
)

data class SyncResponse(
    @SerializedName("synced_at") val syncedAt: Date,
    val cases: List<CaseDTO>,
    val clients: List<ClientDTO>,
)

// Request bodies
data class LoginRequest(val username: String, val password: String)
data class StatusUpdateRequest(val status: String)
data class DeviceTokenRequest(val token: String, val platform: String = "android")

// ── Room Entities (офлайн кэш) ────────────────────────────────────────────────

@Entity(tableName = "cases")
data class CaseEntity(
    @PrimaryKey val id: Int,
    val title: String,
    val caseNumber: String?,
    val status: String,
    val category: String?,
    val court: String?,
    val description: String?,
    val nextHearingDate: Date?,
    val clientId: Int?,
    val clientName: String?,
    val updatedAt: Date,
)

@Entity(tableName = "clients")
data class ClientEntity(
    @PrimaryKey val id: Int,
    val fullName: String,
    val phone: String?,
    val email: String?,
    val inn: String?,
    val updatedAt: Date,
)

// ── Extensions ────────────────────────────────────────────────────────────────

fun CaseDTO.toEntity() = CaseEntity(
    id = id, title = title, caseNumber = caseNumber, status = status,
    category = category, court = court, description = description,
    nextHearingDate = nextHearingDate, clientId = clientId,
    clientName = client?.fullName, updatedAt = updatedAt
)

fun ClientDTO.toEntity() = ClientEntity(
    id = id, fullName = fullName, phone = phone,
    email = email, inn = inn, updatedAt = updatedAt
)

val String.statusLabel get() = when (this) {
    "active" -> "Активное"
    "suspended" -> "Приостановлено"
    "closed" -> "Закрыто"
    "won" -> "Выиграно"
    "lost" -> "Проиграно"
    else -> this
}

val String.categoryLabel get() = when (this) {
    "civil" -> "Гражданское"
    "criminal" -> "Уголовное"
    "administrative" -> "Административное"
    "corporate" -> "Корпоративное"
    else -> "Прочее"
}
