package com.timetracker.premium

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.vectorResource
import androidx.hilt.navigation.compose.hiltViewModel
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

    Scaffold(
        bottomBar = {
            NavigationBar {
                val items = listOf(Screen.Dashboard, Screen.Reports, Screen.Settings)
                items.forEach { screen ->
                    NavigationBarItem(
                        selected = currentScreen == screen,
                        onClick = { currentScreen = screen },
                        label = { Text(screen.title) },
                        icon = {
                            // In real production, load custom vector icon drawables
                            // Icon(imageVector = ImageVector.vectorResource(id = ...), contentDescription = null)
                            Text(screen.title.take(1)) // fallback initial for template
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        // In real app, mount Standard Compose Navigation graph:
        // NavHost(navController, startDestination = "dashboard", modifier = Modifier.padding(innerPadding))
        Modifier.padding(innerPadding)
        
        // Simple screen router for clean view illustration
        when (currentScreen) {
            Screen.Dashboard -> {
                // DashboardScreen(viewModel)
            }
            Screen.Reports -> {
                // ReportsScreen(viewModel)
            }
            Screen.Settings -> {
                // SettingsScreen(viewModel)
            }
        }
    }
}
