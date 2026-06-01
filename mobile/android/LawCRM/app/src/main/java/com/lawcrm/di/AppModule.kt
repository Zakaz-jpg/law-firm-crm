package com.lawcrm.di

import android.content.Context
import android.net.Uri
import androidx.room.Room
import com.lawcrm.data.api.ApiService
import com.lawcrm.data.db.AppDatabase
import com.lawcrm.data.db.CaseDao
import com.lawcrm.data.db.ClientDao
import com.lawcrm.viewmodel.ACCESS_TOKEN_KEY
import com.lawcrm.viewmodel.dataStore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    // Меняется из LoginScreen перед входом
    var BASE_URL = "https://quiet-loops-drop.loca.lt"

    @Provides
    @Singleton
    fun provideApiService(@ApplicationContext context: Context): ApiService {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .addInterceptor { chain ->
                val original = chain.request()
                // Перезаписываем host динамически при каждом запросе
                val parsed = Uri.parse(BASE_URL)
                val newUrl = original.url.newBuilder()
                    .scheme(parsed.scheme ?: "https")
                    .host(parsed.host ?: original.url.host)
                    .apply {
                        val port = parsed.port
                        if (port > 0) port(port) else port(-1)
                    }
                    .build()

                val req = original.newBuilder()
                    .url(newUrl)
                    .header("bypass-tunnel-reminder", "true")
                    .apply {
                        runBlocking { context.dataStore.data.first()[ACCESS_TOKEN_KEY] }
                            ?.let { header("Authorization", "Bearer $it") }
                    }
                    .build()
                chain.proceed(req)
            }
            .build()

        return Retrofit.Builder()
            .baseUrl("https://placeholder.invalid/api/v1/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "lawcrm.db").build()

    @Provides fun provideCaseDao(db: AppDatabase): CaseDao = db.caseDao()
    @Provides fun provideClientDao(db: AppDatabase): ClientDao = db.clientDao()
}
