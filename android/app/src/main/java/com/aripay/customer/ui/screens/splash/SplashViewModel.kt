package com.aripay.customer.ui.screens.splash

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aripay.customer.domain.model.Resource
import com.aripay.customer.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface SplashNavigationState {
    data object Checking : SplashNavigationState
    data object NavigateToHome : SplashNavigationState
    data object NavigateToLogin : SplashNavigationState
}

@HiltViewModel
class SplashViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _navigationState = MutableStateFlow<SplashNavigationState>(SplashNavigationState.Checking)
    val navigationState = _navigationState.asStateFlow()

    init {
        checkSession()
    }

    fun checkSession() {
        viewModelScope.launch {
            if (!authRepository.isSessionActive()) {
                _navigationState.value = SplashNavigationState.NavigateToLogin
                return@launch
            }

            // Verifikasi token aktif ke server AriPay via GET /api/auth/me
            authRepository.getProfile().collect { result ->
                when (result) {
                    is Resource.Success -> {
                        _navigationState.value = SplashNavigationState.NavigateToHome
                    }
                    is Resource.Error -> {
                        // Token ditolak server (401 atau invalid) -> arahkan ke Login
                        _navigationState.value = SplashNavigationState.NavigateToLogin
                    }
                    is Resource.Loading -> {
                        _navigationState.value = SplashNavigationState.Checking
                    }
                }
            }
        }
    }
}
