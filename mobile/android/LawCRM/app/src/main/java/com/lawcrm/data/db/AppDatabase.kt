package com.lawcrm.data.db

import androidx.room.*
import com.lawcrm.data.models.CaseEntity
import com.lawcrm.data.models.ClientEntity
import kotlinx.coroutines.flow.Flow
import java.util.Date

// ── Type Converters ───────────────────────────────────────────────────────────

class Converters {
    @TypeConverter fun fromDate(d: Date?): Long? = d?.time
    @TypeConverter fun toDate(ms: Long?): Date? = ms?.let { Date(it) }
}

// ── DAOs ──────────────────────────────────────────────────────────────────────

@Dao
interface CaseDao {
    @Query("SELECT * FROM cases ORDER BY updatedAt DESC")
    fun getAllFlow(): Flow<List<CaseEntity>>

    @Query("SELECT * FROM cases WHERE status = :status ORDER BY updatedAt DESC")
    fun getByStatusFlow(status: String): Flow<List<CaseEntity>>

    @Query("SELECT * FROM cases WHERE id = :id")
    suspend fun getById(id: Int): CaseEntity?

    @Upsert
    suspend fun upsertAll(cases: List<CaseEntity>)

    @Upsert
    suspend fun upsert(case_: CaseEntity)

    @Query("UPDATE cases SET status = :status WHERE id = :id")
    suspend fun updateStatus(id: Int, status: String)
}

@Dao
interface ClientDao {
    @Query("SELECT * FROM clients ORDER BY fullName ASC")
    fun getAllFlow(): Flow<List<ClientEntity>>

    @Query("SELECT * FROM clients WHERE fullName LIKE '%' || :query || '%'")
    fun searchFlow(query: String): Flow<List<ClientEntity>>

    @Upsert
    suspend fun upsertAll(clients: List<ClientEntity>)
}

// ── Database ──────────────────────────────────────────────────────────────────

@Database(
    entities = [CaseEntity::class, ClientEntity::class],
    version = 1,
    exportSchema = false,
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun caseDao(): CaseDao
    abstract fun clientDao(): ClientDao
}
