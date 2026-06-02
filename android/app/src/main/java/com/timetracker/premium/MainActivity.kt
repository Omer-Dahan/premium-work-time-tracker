package com.timetracker.premium

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import com.timetracker.premium.data.ProjectEntity
import com.timetracker.premium.ui.screens.CreateProjectDialog
import com.timetracker.premium.ui.screens.DashboardScreen
import com.timetracker.premium.ui.screens.ReportsScreen
import com.timetracker.premium.ui.screens.SettingsScreen
import com.timetracker.premium.ui.theme.PremiumTimeTrackerTheme
import com.timetracker.premium.ui.viewModel.TrackerViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            PremiumTimeTrackerTheme {
                val viewModel: TrackerViewModel = hiltViewModel()
                MainAppScreen(viewModel = viewModel)
            }
        }
    }
}

sealed class Screen(val route: String, val title: String) {
    object Dashboard : Screen("dashboard", "Dashboard")
    object Reports : Screen("reports", "Reports")
    object Settings : Screen("settings", "Settings")
}

@Composable
fun MainAppScreen(viewModel: TrackerViewModel) {
    var currentScreen by remember { mutableStateOf<Screen>(Screen.Dashboard) }
    var showCreateDialog by remember { mutableStateOf(false) }
    var editingProject by remember { mutableStateOf<ProjectEntity?>(null) }

    if (showCreateDialog || editingProject != null) {
        CreateProjectDialog(
            project = editingProject,
            onDismiss = {
                showCreateDialog = false
                editingProject = null
            },
            onSave = { project ->
                viewModel.saveProject(project)
                showCreateDialog = false
                editingProject = null
            }
        )
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = currentScreen == Screen.Dashboard,
                    onClick = { currentScreen = Screen.Dashboard },
                    label = { Text("Dashboard") },
                    icon = { Icon(Icons.Default.Home, contentDescription = "Dashboard") }
                )
                NavigationBarItem(
                    selected = currentScreen == Screen.Reports,
                    onClick = { currentScreen = Screen.Reports },
                    label = { Text("Reports") },
                    icon = { Icon(Icons.Default.BarChart, contentDescription = "Reports") }
                )
                NavigationBarItem(
                    selected = currentScreen == Screen.Settings,
                    onClick = { currentScreen = Screen.Settings },
                    label = { Text("Settings") },
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") }
                )
            }
        }
    ) { innerPadding ->
        when (currentScreen) {
            Screen.Dashboard -> DashboardScreen(
                viewModel = viewModel,
                modifier = Modifier.padding(innerPadding),
                onCreateProjectClick = { showCreateDialog = true },
                onEditProjectClick = { project -> editingProject = project }
            )
            Screen.Reports -> ReportsScreen(
                viewModel = viewModel,
                modifier = Modifier.padding(innerPadding)
            )
            Screen.Settings -> SettingsScreen(
                viewModel = viewModel,
                modifier = Modifier.padding(innerPadding)
            )
        }
    }
}
