package com.aripay.customer.data.api.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class RegisterRequest(
    @SerialName("name") val name: String,
    @SerialName("phone_number") val phoneNumber: String,
    @SerialName("password") val password: String
)

@Serializable
data class LoginRequest(
    @SerialName("phone_number") val phoneNumber: String,
    @SerialName("password") val password: String
)

@Serializable
data class AuthResponse(
    @SerialName("success") val success: Boolean,
    @SerialName("message") val message: String? = null,
    @SerialName("token") val token: String? = null,
    @SerialName("user") val user: UserDto? = null
)

@Serializable
data class UserProfileResponse(
    @SerialName("success") val success: Boolean,
    @SerialName("message") val message: String? = null,
    @SerialName("user") val user: UserDto? = null
)

@Serializable
data class GenericApiResponse(
    @SerialName("success") val success: Boolean,
    @SerialName("message") val message: String? = null
)

@Serializable
data class UserDto(
    @SerialName("id") val id: Int,
    @SerialName("name") val name: String,
    @SerialName("phone_number") val phoneNumber: String,
    @SerialName("role") val role: String? = "MEMBER",
    @SerialName("is_active") val isActive: Boolean? = true,
    @SerialName("created_at") val createdAt: String? = null
)
