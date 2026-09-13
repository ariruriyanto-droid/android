package com.aripay.customer.ui.navigation

import androidx.compose.runtime.Composable
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.aripay.customer.ui.screens.home.HomePlaceholderScreen
import com.aripay.customer.ui.screens.login.LoginScreen
import com.aripay.customer.ui.screens.login.LoginViewModel
import com.aripay.customer.ui.screens.profile.ProfileScreen
import com.aripay.customer.ui.screens.profile.ProfileViewModel
import com.aripay.customer.ui.screens.register.RegisterScreen
import com.aripay.customer.ui.screens.register.RegisterViewModel
import com.aripay.customer.ui.screens.splash.SplashScreen
import com.aripay.customer.ui.screens.splash.SplashViewModel
import com.aripay.customer.ui.screens.wallet.WalletScreen
import com.aripay.customer.ui.screens.wallet.WalletViewModel

@Composable
fun AriPayNavGraph(
    navController: NavHostController = rememberNavController()
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Splash.route
    ) {
        // 1. Splash Screen
        composable(Screen.Splash.route) {
            val viewModel: SplashViewModel = hiltViewModel()
            SplashScreen(
                viewModel = viewModel,
                onNavigateToHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToLogin = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }

        // 2. Login Screen
        composable(Screen.Login.route) {
            val viewModel: LoginViewModel = hiltViewModel()
            LoginScreen(
                viewModel = viewModel,
                onLoginSuccess = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onNavigateToRegister = {
                    navController.navigate(Screen.Register.route)
                }
            )
        }

        // 3. Register Screen
        composable(Screen.Register.route) {
            val viewModel: RegisterViewModel = hiltViewModel()
            RegisterScreen(
                viewModel = viewModel,
                onRegisterSuccess = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Register.route) { inclusive = true }
                    }
                },
                onNavigateBackToLogin = {
                    navController.popBackStack()
                }
            )
        }

        // 4. Home Screen
        composable(Screen.Home.route) {
            HomePlaceholderScreen(
                onNavigateToProfile = {
                    navController.navigate(Screen.Profile.route)
                },
                onNavigateToWallet = {
                    navController.navigate(Screen.Wallet.route)
                }
            )
        }

        // 5. Profile Screen
        composable(Screen.Profile.route) {
            val viewModel: ProfileViewModel = hiltViewModel()
            ProfileScreen(
                viewModel = viewModel,
                onLogoutSuccess = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                }
            )
        }

        // 6. Wallet / Mutasi Screen (Sub-Phase 2A)
        composable(Screen.Wallet.route) {
            val viewModel: WalletViewModel = hiltViewModel()
            WalletScreen(
                viewModel = viewModel,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
    }
}
