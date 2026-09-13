package com.aripay.customer.ui.screens.login

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

data class LoginFormState(
    val phoneNumber: String = "",
    val phoneNumberError: String? = null,
    val password: String = "",
    val passwordError: String? = null,
    val isFormValid: Boolean = false
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _formState = MutableStateFlow(LoginFormState())
    val formState = _formState.asStateFlow()

    private val _loginState = MutableStateFlow<UiState<User>>(UiState.Idle)
    val loginState = _loginState.asStateFlow()

    fun onPhoneNumberChanged(number: String) {
        val filtered = number.filter { it.isDigit() }
        val error = when {
            filtered.isEmpty() -> "Nomor handphone wajib diisi"
            filtered.length < 10 -> "Nomor handphone minimal 10 digit"
            !filtered.startsWith("08") && !filtered.startsWith("62") -> "Nomor harus diawali 08 atau 62"
            else -> null
        }
        val isPasswordValid = _formState.value.password.length >= 6
        _formState.value = _formState.value.copy(
            phoneNumber = filtered,
            phoneNumberError = error,
            isFormValid = error == null && isPasswordValid
        )
    }

    fun onPasswordChanged(password: String) {
        val error = when {
            password.isEmpty() -> "Kata sandi wajib diisi"
            password.length < 6 -> "Kata sandi minimal 6 karakter"
            else -> null
        }
        val isPhoneValid = _formState.value.phoneNumber.length >= 10 && _formState.value.phoneNumberError == null
        _formState.value = _formState.value.copy(
            password = password,
            passwordError = error,
            isFormValid = error == null && isPhoneValid
        )
    }

    fun login() {
        val state = _formState.value
        if (!state.isFormValid) return

        viewModelScope.launch {
            authRepository.login(state.phoneNumber, state.password).collect { result ->
                when (result) {
                    is Resource.Loading -> _loginState.value = UiState.Loading
                    is Resource.Success -> _loginState.value = UiState.Success(result.data)
                    is Resource.Error -> _loginState.value = UiState.Error(result.message, result.statusCode)
                }
            }
        }
    }

    fun resetState() {
        _loginState.value = UiState.Idle
    }
}
