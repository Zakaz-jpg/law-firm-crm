package com.lawcrm.data.api

import com.lawcrm.data.models.*
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

interface ApiService {

    @FormUrlEncoded
    @POST("auth/login")
    suspend fun login(
        @Field("username") username: String,
        @Field("password") password: String,
    ): TokenResponse

    @POST("auth/refresh")
    suspend fun refreshToken(@Body body: Map<String, String>): TokenResponse

    @POST("auth/device-token")
    suspend fun registerDeviceToken(@Body body: DeviceTokenRequest)

    @GET("cases")
    suspend fun getCases(
        @Query("status") status: String? = null,
        @Query("q") query: String? = null,
    ): List<CaseDTO>

    @GET("cases/{id}")
    suspend fun getCase(@Path("id") id: Int): CaseDTO

    @POST("cases")
    suspend fun createCase(@Body body: Map<String, Any?>): CaseDTO

    @PATCH("cases/{id}/status")
    suspend fun updateStatus(@Path("id") id: Int, @Body body: StatusUpdateRequest): CaseDTO

    @GET("clients")
    suspend fun getClients(@Query("q") query: String? = null): List<ClientDTO>

    @POST("clients")
    suspend fun createClient(@Body body: Map<String, Any?>): ClientDTO

    @Multipart
    @POST("cases/{caseId}/attachments")
    suspend fun uploadAttachment(
        @Path("caseId") caseId: Int,
        @Part file: MultipartBody.Part,
    ): AttachmentDTO

    @GET("sync")
    suspend fun sync(): SyncResponse
}

object RetrofitClient {
    fun create(baseUrl: String, tokenProvider: () -> String?): ApiService {
        val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY }

        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .addInterceptor { chain ->
                val original = chain.request()
                val req = original.newBuilder()
                    .header("bypass-tunnel-reminder", "true")
                    .apply {
                        tokenProvider()?.let { header("Authorization", "Bearer $it") }
                    }
                    .build()
                chain.proceed(req)
            }
            .build()

        return Retrofit.Builder()
            .baseUrl("$baseUrl/api/v1/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
