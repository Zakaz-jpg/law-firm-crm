package com.lawcrm.ui.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import androidx.hilt.navigation.compose.hiltViewModel
import com.lawcrm.di.AppModule
import com.lawcrm.viewmodel.AuthViewModel
import com.lawcrm.viewmodel.LoginState

@Composable
fun LoginScreen(vm: AuthViewModel = hiltViewModel()) {
    val context = LocalContext.current
    val loginState by vm.loginState.collectAsState()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var showServerField by remember { mutableStateOf(false) }
    var serverUrl by remember { mutableStateOf(AppModule.BASE_URL) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Spacer(Modifier.height(48.dp))

        Icon(
            imageVector = Icons.Default.Fingerprint,
            contentDescription = null,
            modifier = Modifier.size(72.dp),
            tint = MaterialTheme.colorScheme.primary,
        )
        Text("LawCRM", style = MaterialTheme.typography.headlineLarge)
        Text("Управление делами",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant)

        Spacer(Modifier.height(8.dp))

        OutlinedTextField(
            value = email, onValueChange = { email = it },
            label = { Text("Email") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        OutlinedTextField(
            value = password, onValueChange = { password = it },
            label = { Text("Пароль") },
            visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            trailingIcon = {
                IconButton(onClick = { showPassword = !showPassword }) {
                    Icon(
                        if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                        contentDescription = null,
                    )
                }
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        if (loginState is LoginState.Error) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                ),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    (loginState as LoginState.Error).message,
                    modifier = Modifier.padding(12.dp),
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }

        Button(
            onClick = {
                AppModule.BASE_URL = serverUrl.trimEnd('/')
                vm.login(email, password)
            },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            enabled = email.isNotBlank() && password.isNotBlank() && loginState !is LoginState.Loading,
        ) {
            if (loginState is LoginState.Loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            } else {
                Text("Войти")
            }
        }

        if (vm.canUseBiometrics) {
            OutlinedButton(
                onClick = { vm.loginWithBiometrics(context as FragmentActivity) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Default.Fingerprint, null, modifier = Modifier.padding(end = 8.dp))
                Text("Войти по биометрии")
            }
        }

        // Адрес сервера
        TextButton(
            onClick = { showServerField = !showServerField },
        ) {
            Icon(Icons.Default.Language, null, modifier = Modifier.padding(end = 4.dp))
            Text(if (showServerField) "Скрыть сервер" else "Адрес сервера",
                style = MaterialTheme.typography.bodySmall)
        }

        AnimatedVisibility(visible = showServerField) {
            OutlinedTextField(
                value = serverUrl,
                onValueChange = { serverUrl = it },
                label = { Text("URL сервера") },
                placeholder = { Text("https://xxxx.loca.lt") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                supportingText = {
                    Text("Без /api/v1 в конце",
                        style = MaterialTheme.typography.labelSmall)
                },
            )
        }

        Spacer(Modifier.height(16.dp))
    }
}
