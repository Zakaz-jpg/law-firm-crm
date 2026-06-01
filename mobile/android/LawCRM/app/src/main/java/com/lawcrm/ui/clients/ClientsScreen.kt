package com.lawcrm.ui.clients

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lawcrm.data.models.ClientEntity
import com.lawcrm.data.repository.CrmRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ClientsViewModel @Inject constructor(private val repo: CrmRepository) : ViewModel() {
    private val _query = MutableStateFlow("")
    val query = _query.asStateFlow()

    val clients: StateFlow<List<ClientEntity>> = _query.flatMapLatest { q ->
        if (q.isBlank()) repo.clientsFlow() else repo.clientSearchFlow(q)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setQuery(q: String) { _query.value = q }

    fun createClient(fullName: String, phone: String?, email: String?, inn: String?, onDone: () -> Unit) =
        viewModelScope.launch {
            repo.createClient(fullName, phone, email, inn).onSuccess { onDone() }
        }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientsScreen(vm: ClientsViewModel = hiltViewModel()) {
    val clients by vm.clients.collectAsState()
    val query by vm.query.collectAsState()
    var showCreate by remember { mutableStateOf(false) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Клиенты") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showCreate = true }) {
                Icon(Icons.Default.Add, "Добавить клиента")
            }
        },
    ) { padding ->
        Column(Modifier.padding(padding)) {
            SearchBar(
                query = query, onQueryChange = vm::setQuery, onSearch = {},
                active = false, onActiveChange = {},
                placeholder = { Text("Поиск клиента") },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            ) {}

            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(clients, key = { it.id }) { client ->
                    ClientCard(client)
                }
            }
        }
    }

    if (showCreate) {
        CreateClientDialog(
            onDismiss = { showCreate = false },
            onCreate = { name, phone, email, inn ->
                vm.createClient(name, phone, email, inn) { showCreate = false }
            }
        )
    }
}

@Composable
fun ClientCard(client: ClientEntity) {
    Card(modifier = Modifier.fillMaxWidth()) {
        ListItem(
            headlineContent = { Text(client.fullName) },
            supportingContent = {
                Column {
                    client.phone?.let { Text("Тел: $it") }
                    client.inn?.let { Text("ИНН: $it") }
                }
            },
            leadingContent = { Icon(Icons.Default.Person, contentDescription = null) },
        )
    }
}

@Composable
fun CreateClientDialog(onDismiss: () -> Unit, onCreate: (String, String?, String?, String?) -> Unit) {
    var fullName by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var inn by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Новый клиент") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(fullName, { fullName = it }, label = { Text("ФИО / Организация *") }, singleLine = true)
                OutlinedTextField(phone, { phone = it }, label = { Text("Телефон") }, singleLine = true)
                OutlinedTextField(email, { email = it }, label = { Text("Email") }, singleLine = true)
                OutlinedTextField(inn, { inn = it }, label = { Text("ИНН") }, singleLine = true)
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onCreate(fullName, phone.ifBlank { null }, email.ifBlank { null }, inn.ifBlank { null }) },
                enabled = fullName.isNotBlank(),
            ) { Text("Создать") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Отмена") } },
    )
}
