package com.lawcrm.ui.cases

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.lawcrm.data.models.CaseDTO
import com.lawcrm.data.models.categoryLabel
import com.lawcrm.data.models.statusLabel
import com.lawcrm.data.repository.CrmRepository
import com.lawcrm.viewmodel.CasesViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CaseDetailScreen(
    caseId: Int,
    onBack: () -> Unit,
    vm: CasesViewModel = hiltViewModel(),
    detailVm: CaseDetailViewModel = hiltViewModel(),
) {
    val case by vm.selectedCase.collectAsState()
    var showStatusSheet by remember { mutableStateOf(false) }
    val context = LocalContext.current

    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let { detailVm.uploadFromUri(caseId, it, context) }
    }

    LaunchedEffect(caseId) { vm.loadCase(caseId) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Дело", maxLines = 1) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Назад") }
                },
                actions = {
                    IconButton(onClick = { photoPicker.launch("image/*") }) {
                        Icon(Icons.Default.AttachFile, "Прикрепить")
                    }
                    IconButton(onClick = { showStatusSheet = true }) {
                        Icon(Icons.Default.Edit, "Статус")
                    }
                }
            )
        }
    ) { padding ->
        if (case == null) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = androidx.compose.ui.Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            case?.let { dto ->
                CaseDetailContent(dto = dto, modifier = Modifier.padding(padding))
            }
        }
    }

    if (showStatusSheet) {
        ModalBottomSheet(onDismissRequest = { showStatusSheet = false }) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Изменить статус", style = MaterialTheme.typography.titleMedium)
                listOf("active", "suspended", "closed", "won", "lost").forEach { status ->
                    OutlinedButton(
                        onClick = {
                            vm.updateStatus(caseId, status)
                            showStatusSheet = false
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text(status.statusLabel) }
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
fun CaseDetailContent(dto: CaseDTO, modifier: Modifier = Modifier) {
    val fmt = remember { SimpleDateFormat("dd MMMM yyyy, HH:mm", Locale("ru")) }

    Column(
        modifier = modifier.verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    StatusChip(dto.status)
                }
                Text(dto.title, style = MaterialTheme.typography.headlineSmall)
                dto.caseNumber?.let { Text("Номер: $it", style = MaterialTheme.typography.bodyMedium) }
            }
        }

        dto.client?.let { client ->
            InfoCard(title = "Клиент") {
                InfoRow("ФИО/Название", client.fullName)
                client.phone?.let { InfoRow("Телефон", it) }
                client.inn?.let { InfoRow("ИНН", it) }
            }
        }

        if (dto.category != null || dto.court != null || dto.nextHearingDate != null) {
            InfoCard(title = "Детали дела") {
                dto.category?.let { InfoRow("Категория", it.categoryLabel) }
                dto.court?.let { InfoRow("Суд", it) }
                dto.nextHearingDate?.let { date ->
                    InfoRow("Заседание", fmt.format(date),
                        valueColor = if (date.before(Date())) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface)
                }
            }
        }

        dto.description?.let { desc ->
            InfoCard(title = "Описание") {
                Text(desc, style = MaterialTheme.typography.bodyMedium)
            }
        }

        if (dto.attachments.isNotEmpty()) {
            InfoCard(title = "Вложения (${dto.attachments.size})") {
                dto.attachments.forEach { att ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(att.originalFilename, style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.weight(1f))
                        Text(formatBytes(att.fileSize), style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
fun InfoCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary)
            content()
        }
    }
}

@Composable
fun InfoRow(label: String, value: String, valueColor: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurface) {
    Row(Modifier.fillMaxWidth()) {
        Text("$label: ", style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(120.dp))
        Text(value, style = MaterialTheme.typography.bodyMedium, color = valueColor, modifier = Modifier.weight(1f))
    }
}

fun formatBytes(bytes: Long): String = when {
    bytes >= 1_048_576 -> "%.1f МБ".format(bytes / 1_048_576.0)
    bytes >= 1024 -> "%.0f КБ".format(bytes / 1024.0)
    else -> "$bytes Б"
}

@HiltViewModel
class CaseDetailViewModel @Inject constructor(
    private val repo: CrmRepository,
) : androidx.lifecycle.ViewModel() {
    fun uploadFromUri(caseId: Int, uri: Uri, context: android.content.Context) {
        viewModelScope.launch {
            val stream = context.contentResolver.openInputStream(uri) ?: return@launch
            val data = stream.readBytes()
            stream.close()
            val mime = context.contentResolver.getType(uri) ?: "image/jpeg"
            val filename = "${UUID.randomUUID()}.jpg"
            repo.uploadAttachment(caseId, data, filename, mime)
        }
    }
}
