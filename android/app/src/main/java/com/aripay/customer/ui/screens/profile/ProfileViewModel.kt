package com.aripay.customer.ui.screens.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aripay.customer.domain.model.Resource
import com.aripay.customer.domain.model.User
import com.aripay.customer.domain.repository.AuthRepository
import com.aripay.customer.ui.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _profileState = MutableStateFlow<UiState<User>>(UiState.Idle)
    val profileState = _profileState.asStateFlow()

    private val _logoutState = MutableStateFlow<UiState<Unit>>(UiState.Idle)
    val logoutState = _logoutState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            authRepository.getProfile().collect { result ->
                when (result) {
                    is Resource.Loading -> _profileState.value = UiState.Loading
                    is Resource.Success -> _profileState.value = UiState.Success(result.data)
                    is Resource.Error -> _profileState.value = UiState.Error(result.message, result.statusCode)
                }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout().collect { result ->
                when (result) {
                    is Resource.Loading -> _logoutState.value = UiState.Loading
                    is Resource.Success -> _logoutState.value = UiState.Success(Unit)
                    is Resource.Error -> _logoutState.value = UiState.Success(Unit) // Logout lokal selalu sukses
                }
            }
        }
    }
}
