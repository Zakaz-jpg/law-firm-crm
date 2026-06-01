package com.lawcrm.ui.cases

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.lawcrm.data.models.CaseEntity
import com.lawcrm.data.models.categoryLabel
import com.lawcrm.data.models.statusLabel
import com.lawcrm.viewmodel.CasesViewModel
import com.lawcrm.viewmodel.SyncState
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CasesScreen(
    onCaseClick: (Int) -> Unit,
    vm: CasesViewModel = hiltViewModel(),
) {
    val cases by vm.cases.collectAsState()
    val syncState by vm.syncState.collectAsState()
    val query by vm.searchQuery.collectAsState()
    var showCreate by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Мои дела") },
                actions = {
                    if (syncState is SyncState.Syncing) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp).padding(end = 12.dp), strokeWidth = 2.dp)
                    } else {
                        IconButton(onClick = { vm.sync() }) { Icon(Icons.Default.Sync, "Синхронизировать") }
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showCreate = true }) {
                Icon(Icons.Default.Add, contentDescription = "Добавить дело")
            }
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            SearchBar(
                query = query,
                onQueryChange = vm::setSearch,
                onSearch = {},
                active = false,
                onActiveChange = {},
                placeholder = { Text("Поиск по делам") },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            ) {}

            if (syncState is SyncState.Error) {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                ) {
                    Text(
                        (syncState as SyncState.Error).message,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                    )
                }
            }

            if (cases.isEmpty() && syncState !is SyncState.Syncing) {
                Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                    Text("Нет дел. Нажмите +", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(cases, key = { it.id }) { case ->
                        CaseCard(case = case, onClick = { onCaseClick(case.id) })
                    }
                }
            }
        }
    }

    if (showCreate) {
        CreateCaseDialog(
            onDismiss = { showCreate = false },
            onCreate = { title, number, category ->
                vm.createCase(title, number, category) { showCreate = false }
            }
        )
    }
}

@Composable
fun CaseCard(case: CaseEntity, onClick: () -> Unit) {
    val fmt = remember { SimpleDateFormat("dd MMM yyyy", Locale("ru")) }

    Card(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(case.title, style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f))
                StatusChip(status = case.status)
            }
            case.caseNumber?.let {
                Text("№ $it", style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            case.clientName?.let {
                Text("Клиент: $it", style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            case.nextHearingDate?.let { date ->
                val isPast = date.before(Date())
                Text(
                    "Заседание: ${fmt.format(date)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = if (isPast) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
fun StatusChip(status: String) {
    val (containerColor, contentColor) = when (status) {
        "active" -> MaterialTheme.colorScheme.primaryContainer to MaterialTheme.colorScheme.onPrimaryContainer
        "won" -> MaterialTheme.colorScheme.tertiaryContainer to MaterialTheme.colorScheme.onTertiaryContainer
        "lost" -> MaterialTheme.colorScheme.errorContainer to MaterialTheme.colorScheme.onErrorContainer
        "suspended" -> MaterialTheme.colorScheme.secondaryContainer to MaterialTheme.colorScheme.onSecondaryContainer
        else -> MaterialTheme.colorScheme.surfaceVariant to MaterialTheme.colorScheme.onSurfaceVariant
    }
    Surface(shape = MaterialTheme.shapes.small, color = containerColor, contentColor = contentColor) {
        Text(status.statusLabel, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
    }
}

@Composable
fun CreateCaseDialog(onDismiss: () -> Unit, onCreate: (String, String?, String?) -> Unit) {
    var title by remember { mutableStateOf("") }
    var caseNumber by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Новое дело") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = title, onValueChange = { title = it },
                    label = { Text("Название *") }, singleLine = true)
                OutlinedTextField(value = caseNumber, onValueChange = { caseNumber = it },
                    label = { Text("Номер дела") }, singleLine = true)
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onCreate(title, caseNumber.ifBlank { null }, category.ifBlank { null }) },
                enabled = title.isNotBlank(),
            ) { Text("Создать") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Отмена") } },
    )
}
