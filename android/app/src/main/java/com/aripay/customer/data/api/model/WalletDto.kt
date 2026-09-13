package com.aripay.customer.data.api.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class BalanceResponse(
    @SerialName("success") val success: Boolean,
    @SerialName("message") val message: String? = null,
    @SerialName("data") val data: BalanceDataDto? = null
)

@Serializable
data class BalanceDataDto(
    @SerialName("user_id") val userId: Int,
    @SerialName("full_name") val fullName: String,
    @SerialName("phone_number") val phoneNumber: String,
    @SerialName("balance") val balance: Double
)

@Serializable
data class MutationsResponse(
    @SerialName("success") val success: Boolean,
    @SerialName("message") val message: String? = null,
    @SerialName("pagination") val pagination: PaginationDto? = null,
    @SerialName("data") val data: List<MutationDto> = emptyList()
)

@Serializable
data class PaginationDto(
    @SerialName("current_page") val currentPage: Int,
    @SerialName("total_records") val totalRecords: Int,
    @SerialName("total_pages") val totalPages: Int
)

@Serializable
data class MutationDto(
    @SerialName("id") val id: Int,
    @SerialName("type") val type: String, // "CREDIT" or "DEBIT"
    @SerialName("amount") val amount: Double,
    @SerialName("balance_before") val balanceBefore: Double,
    @SerialName("balance_after") val balanceAfter: Double,
    @SerialName("reference_type") val referenceType: String? = null,
    @SerialName("reference_id") val referenceId: String? = null,
    @SerialName("description") val description: String? = null,
    @SerialName("created_at") val createdAt: String
)
