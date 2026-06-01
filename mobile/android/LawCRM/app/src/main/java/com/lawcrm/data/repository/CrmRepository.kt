package com.lawcrm.data.repository

import com.lawcrm.data.api.ApiService
import com.lawcrm.data.db.CaseDao
import com.lawcrm.data.db.ClientDao
import com.lawcrm.data.models.*
import kotlinx.coroutines.flow.Flow
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CrmRepository @Inject constructor(
    private val api: ApiService,
    private val caseDao: CaseDao,
    private val clientDao: ClientDao,
) {
    // ── Offline-first streams ─────────────────────────────────────────────────

    fun casesFlow(): Flow<List<CaseEntity>> = caseDao.getAllFlow()
    fun clientsFlow(): Flow<List<ClientEntity>> = clientDao.getAllFlow()
    fun clientSearchFlow(query: String): Flow<List<ClientEntity>> = clientDao.searchFlow(query)

    // ── Sync ──────────────────────────────────────────────────────────────────

    suspend fun sync(): Result<Unit> = runCatching {
        val response = api.sync()
        caseDao.upsertAll(response.cases.map { it.toEntity() })
        clientDao.upsertAll(response.clients.map { it.toEntity() })
    }

    // ── Cases ─────────────────────────────────────────────────────────────────

    suspend fun getCase(id: Int): Result<CaseDTO> = runCatching { api.getCase(id) }

    suspend fun createCase(title: String, caseNumber: String?, category: String?): Result<CaseDTO> =
        runCatching {
            val body = buildMap<String, Any?> {
                put("title", title)
                caseNumber?.let { put("case_number", it) }
                category?.let { put("category", it) }
            }
            api.createCase(body).also { caseDao.upsert(it.toEntity()) }
        }

    suspend fun updateStatus(id: Int, status: String): Result<CaseDTO> = runCatching {
        api.updateStatus(id, StatusUpdateRequest(status)).also {
            caseDao.updateStatus(id, status)
        }
    }

    // ── Clients ───────────────────────────────────────────────────────────────

    suspend fun createClient(
        fullName: String, phone: String?, email: String?, inn: String?
    ): Result<ClientDTO> = runCatching {
        val body = buildMap<String, Any?> {
            put("full_name", fullName)
            phone?.let { put("phone", it) }
            email?.let { put("email", it) }
            inn?.let { put("inn", it) }
        }
        api.createClient(body)
    }

    // ── Attachments ───────────────────────────────────────────────────────────

    suspend fun uploadAttachment(caseId: Int, data: ByteArray, filename: String, mimeType: String): Result<AttachmentDTO> =
        runCatching {
            val body = data.toRequestBody(mimeType.toMediaTypeOrNull())
            val part = MultipartBody.Part.createFormData("file", filename, body)
            api.uploadAttachment(caseId, part)
        }
}
