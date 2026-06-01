package com.lawcrm

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.lawcrm.ui.auth.LoginScreen
import com.lawcrm.ui.cases.CaseDetailScreen
import com.lawcrm.ui.cases.CasesScreen
import com.lawcrm.ui.clients.ClientsScreen
import com.lawcrm.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            LawCRMTheme {
                LawCRMApp()
            }
        }
    }
}

@Composable
fun LawCRMApp(authVm: AuthViewModel = hiltViewModel()) {
    val isLoggedIn by authVm.isLoggedIn.collectAsState()
    if (!isLoggedIn) {
        LoginScreen(vm = authVm)
    } else {
        MainScaffold(authVm = authVm)
    }
}

@Composable
fun MainScaffold(authVm: AuthViewModel) {
    val navController = rememberNavController()
    val navBackStack by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStack?.destination?.route
    val showBottomBar = currentRoute in listOf("cases", "clients", "settings")

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    NavigationBarItem(
                        selected = currentRoute == "cases",
                        onClick = { navController.navigate("cases") { launchSingleTop = true } },
                        icon = { Icon(Icons.Default.Folder, null) },
                        label = { Text("Дела") },
                    )
                    NavigationBarItem(
                        selected = currentRoute == "clients",
                        onClick = { navController.navigate("clients") { launchSingleTop = true } },
                        icon = { Icon(Icons.Default.People, null) },
                        label = { Text("Клиенты") },
                    )
                    NavigationBarItem(
                        selected = currentRoute == "settings",
                        onClick = { navController.navigate("settings") { launchSingleTop = true } },
                        icon = { Icon(Icons.Default.Settings, null) },
                        label = { Text("Настройки") },
                    )
                }
            }
        }
    ) { padding ->
        NavHost(navController, startDestination = "cases", modifier = Modifier.padding(padding)) {
            composable("cases") {
                CasesScreen(onCaseClick = { navController.navigate("case/$it") })
            }
            composable(
                "case/{id}",
                arguments = listOf(navArgument("id") { type = NavType.IntType })
            ) { back ->
                CaseDetailScreen(
                    caseId = back.arguments!!.getInt("id"),
                    onBack = { navController.popBackStack() }
                )
            }
            composable("clients") { ClientsScreen() }
            composable("settings") { SettingsScreen(authVm = authVm) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(authVm: AuthViewModel) {
    Scaffold(
        topBar = { TopAppBar(title = { Text("Настройки") }) }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            ListItem(
                headlineContent = { Text("Выйти") },
                supportingContent = { Text("Выход из аккаунта") },
                modifier = Modifier.clickable { authVm.logout() },
            )
        }
    }
}

@Composable
fun LawCRMTheme(content: @Composable () -> Unit) {
    MaterialTheme(content = content)
}
