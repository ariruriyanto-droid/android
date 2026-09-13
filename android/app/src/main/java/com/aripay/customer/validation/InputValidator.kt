package com.aripay.customer.validation

object InputValidator {

    fun validatePhone(phone: String): ValidationResult {
        val filtered = phone.filter { it.isDigit() }
        return when {
            filtered.isEmpty() -> ValidationResult(false, "Nomor handphone wajib diisi")
            filtered.length < 10 -> ValidationResult(false, "Nomor handphone minimal 10 digit")
            !filtered.startsWith("08") && !filtered.startsWith("62") ->
                ValidationResult(false, "Nomor harus diawali 08 atau 62")
            else -> ValidationResult(true)
        }
    }

    fun validatePassword(password: String): ValidationResult {
        return when {
            password.isEmpty() -> ValidationResult(false, "Kata sandi wajib diisi")
            password.length < 6 -> ValidationResult(false, "Kata sandi minimal 6 karakter")
            else -> ValidationResult(true)
        }
    }

    fun validateRegister(
        name: String,
        phone: String,
        password: String,
        confirm: String
    ): ValidationResult {
        if (name.trim().length < 3) return ValidationResult(false, "Nama minimal 3 karakter")
        val phoneRes = validatePhone(phone)
        if (!phoneRes.isValid) return phoneRes
        val passRes = validatePassword(password)
        if (!passRes.isValid) return passRes
        if (password != confirm) return ValidationResult(false, "Kata sandi konfirmasi tidak cocok")
        return ValidationResult(true)
    }
}

data class ValidationResult(
    val isValid: Boolean,
    val message: String? = null
)
