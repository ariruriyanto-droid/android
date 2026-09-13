package com.aripay.customer.ui.screens.register

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aripay.customer.domain.model.Resource
import com.aripay.customer.domain.repository.AuthRepository
import com.aripay.customer.ui.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RegisterFormState(
    val name: String = "",
    val nameError: String? = null,
    val phoneNumber: String = "",
    val phoneNumberError: String? = null,
    val password: String = "",
    val passwordError: String? = null,
    val confirmPassword: String = "",
    val confirmPasswordError: String? = null,
    val isFormValid: Boolean = false
)

@HiltViewModel
class RegisterViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _formState = MutableStateFlow(RegisterFormState())
    val formState = _formState.asStateFlow()

    private val _registerState = MutableStateFlow<UiState<String>>(UiState.Idle)
    val registerState = _registerState.asStateFlow()

    fun onNameChanged(name: String) {
        val error = when {
            name.trim().isEmpty() -> "Nama lengkap wajib diisi"
            name.trim().length < 3 -> "Nama minimal 3 karakter"
            else -> null
        }
        _formState.value = _formState.value.copy(name = name, nameError = error)
        validateForm()
    }

    fun onPhoneNumberChanged(number: String) {
        val filtered = number.filter { it.isDigit() }
        val error = when {
            filtered.isEmpty() -> "Nomor handphone wajib diisi"
            filtered.length < 10 -> "Nomor handphone minimal 10 digit"
            !filtered.startsWith("08") && !filtered.startsWith("62") -> "Nomor harus diawali 08 atau 62"
            else -> null
        }
        _formState.value = _formState.value.copy(phoneNumber = filtered, phoneNumberError = error)
        validateForm()
    }

    fun onPasswordChanged(password: String) {
        val error = when {
            password.isEmpty() -> "Kata sandi wajib diisi"
            password.length < 6 -> "Kata sandi minimal 6 karakter"
            else -> null
        }
        _formState.value = _formState.value.copy(password = password, passwordError = error)
        validateConfirmPassword(_formState.value.confirmPassword)
        validateForm()
    }

    fun onConfirmPasswordChanged(confirmPassword: String) {
        validateConfirmPassword(confirmPassword)
        validateForm()
    }

    private fun validateConfirmPassword(confirm: String) {
        val error = when {
            confirm.isEmpty() -> "Konfirmasi kata sandi wajib diisi"
            confirm != _formState.value.password -> "Kata sandi konfirmasi tidak cocok"
            else -> null
        }
        _formState.value = _formState.value.copy(confirmPassword = confirm, confirmPasswordError = error)
    }

    private fun validateForm() {
        val state = _formState.value
        val isValid = state.nameError == null && state.name.trim().isNotEmpty() &&
                state.phoneNumberError == null && state.phoneNumber.isNotEmpty() &&
                state.passwordError == null && state.password.isNotEmpty() &&
                state.confirmPasswordError == null && state.confirmPassword.isNotEmpty()

        _formState.value = _formState.value.copy(isFormValid = isValid)
    }

    fun register() {
        val state = _formState.value
        if (!state.isFormValid) return

        viewModelScope.launch {
            authRepository.register(
                name = state.name,
                phone = state.phoneNumber,
                password = state.password
            ).collect { result ->
                when (result) {
                    is Resource.Loading -> _registerState.value = UiState.Loading
                    is Resource.Success -> _registerState.value = UiState.Success(result.data)
                    is Resource.Error -> _registerState.value = UiState.Error(result.message, result.statusCode)
                }
            }
        }
    }

    fun resetState() {
        _registerState.value = UiState.Idle
    }
}
