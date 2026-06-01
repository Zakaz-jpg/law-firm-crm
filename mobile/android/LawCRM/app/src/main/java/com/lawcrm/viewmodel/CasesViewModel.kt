package com.lawcrm.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lawcrm.data.models.CaseDTO
import com.lawcrm.data.models.CaseEntity
import com.lawcrm.data.repository.CrmRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CasesViewModel @Inject constructor(
    private val repo: CrmRepository,
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    val searchQuery = _searchQuery.asStateFlow()

    val cases: StateFlow<List<CaseEntity>> = repo.casesFlow()
        .combine(_searchQuery) { list, query ->
            if (query.isBlank()) list
            else list.filter { it.title.contains(query, ignoreCase = true) }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _syncState = MutableStateFlow<SyncState>(SyncState.Idle)
    val syncState = _syncState.asStateFlow()

    private val _selectedCase = MutableStateFlow<CaseDTO?>(null)
    val selectedCase = _selectedCase.asStateFlow()

    init { sync() }

    fun setSearch(q: String) { _searchQuery.value = q }

    fun sync() = viewModelScope.launch {
        _syncState.value = SyncState.Syncing
        val result = repo.sync()
        _syncState.value = if (result.isSuccess) SyncState.Done else SyncState.Error(
            result.exceptionOrNull()?.message ?: "Ошибка синхронизации"
        )
    }

    fun loadCase(id: Int) = viewModelScope.launch {
        repo.getCase(id).onSuccess { _selectedCase.value = it }
    }

    fun updateStatus(id: Int, status: String) = viewModelScope.launch {
        repo.updateStatus(id, status).onSuccess {
            _selectedCase.value = it
            sync()
        }
    }

    fun createCase(title: String, caseNumber: String?, category: String?, onDone: () -> Unit) =
        viewModelScope.launch {
            repo.createCase(title, caseNumber, category).onSuccess {
                sync()
                onDone()
            }
        }
}

sealed class SyncState {
    object Idle : SyncState()
    object Syncing : SyncState()
    object Done : SyncState()
    data class Error(val message: String) : SyncState()
}
