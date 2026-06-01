package com.lawcrm.viewmodel

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lawcrm.data.api.ApiService
import com.lawcrm.data.models.TokenResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import javax.inject.Inject
import kotlin.coroutines.resume

val Context.dataStore by preferencesDataStore("auth_prefs")
val ACCESS_TOKEN_KEY = stringPreferencesKey("access_token")
val REFRESH_TOKEN_KEY = stringPreferencesKey("refresh_token")
val SAVED_EMAIL_KEY = stringPreferencesKey("saved_email")

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val api: ApiService,
    @ApplicationContext private val context: Context,
) : ViewModel() {

    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _loginState = MutableStateFlow<LoginState>(LoginState.Idle)
    val loginState: StateFlow<LoginState> = _loginState.asStateFlow()

    val canUseBiometrics: Boolean
        get() = BiometricManager.from(context)
            .canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS

    init {
        viewModelScope.launch {
            context.dataStore.data.first()[ACCESS_TOKEN_KEY]?.let {
                _isLoggedIn.value = true
            }
        }
    }

    fun login(email: String, password: String) = viewModelScope.launch {
        _loginState.value = LoginState.Loading
        try {
            val tokens = api.login(email, password)
            saveTokens(tokens, email)
            _isLoggedIn.value = true
            _loginState.value = LoginState.Success
        } catch (e: Exception) {
            _loginState.value = LoginState.Error(e.message ?: "Ошибка входа")
        }
    }

    fun loginWithBiometrics(activity: FragmentActivity) = viewModelScope.launch {
        val success = showBiometricPrompt(activity)
        if (!success) return@launch

        val prefs = context.dataStore.data.first()
        val refreshToken = prefs[REFRESH_TOKEN_KEY] ?: run {
            _loginState.value = LoginState.Error("Войдите с паролем")
            return@launch
        }
        try {
            val tokens = api.refreshToken(mapOf("refresh_token" to refreshToken))
            saveTokens(tokens, null)
            _isLoggedIn.value = true
            _loginState.value = LoginState.Success
        } catch (e: Exception) {
            _loginState.value = LoginState.Error("Сессия истекла, войдите с паролем")
        }
    }

    fun logout() = viewModelScope.launch {
        context.dataStore.edit { it.clear() }
        _isLoggedIn.value = false
    }

    private suspend fun saveTokens(tokens: TokenResponse, email: String?) {
        context.dataStore.edit { prefs ->
            prefs[ACCESS_TOKEN_KEY] = tokens.accessToken
            prefs[REFRESH_TOKEN_KEY] = tokens.refreshToken
            email?.let { prefs[SAVED_EMAIL_KEY] = it }
        }
    }

    private suspend fun showBiometricPrompt(activity: FragmentActivity): Boolean =
        suspendCancellableCoroutine { cont ->
            val executor = ContextCompat.getMainExecutor(activity)
            val callback = object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    cont.resume(true)
                }
                override fun onAuthenticationFailed() { cont.resume(false) }
                override fun onAuthenticationError(code: Int, msg: CharSequence) { cont.resume(false) }
            }
            val prompt = BiometricPrompt(activity, executor, callback)
            val info = BiometricPrompt.PromptInfo.Builder()
                .setTitle("Вход в LawCRM")
                .setSubtitle("Используйте биометрию для входа")
                .setNegativeButtonText("Отмена")
                .build()
            prompt.authenticate(info)
        }
}

sealed class LoginState {
    object Idle : LoginState()
    object Loading : LoginState()
    object Success : LoginState()
    data class Error(val message: String) : LoginState()
}
