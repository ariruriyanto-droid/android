package com.aripay.customer.domain.model

data class User(
    val id: Int,
    val name: String,
    val phoneNumber: String,
    val role: String = "MEMBER",
    val isActive: Boolean = true
)

sealed interface Resource<out T> {
    data class Success<T>(val data: T) : Resource<T>
    data class Error(val message: String, val statusCode: Int? = null) : Resource<Nothing>
    data object Loading : Resource<Nothing>
}
