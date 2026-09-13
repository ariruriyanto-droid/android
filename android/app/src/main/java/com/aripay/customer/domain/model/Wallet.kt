package com.aripay.customer.domain.model

data class WalletBalance(
    val userId: Int,
    val fullName: String,
    val phoneNumber: String,
    val balance: Double
)

enum class MutationType {
    CREDIT,
    DEBIT
}

data class BalanceMutation(
    val id: Int,
    val type: MutationType,
    val amount: Double,
    val balanceBefore: Double,
    val balanceAfter: Double,
    val referenceType: String?,
    val referenceId: String?,
    val description: String?,
    val createdAt: String
)

data class MutationPage(
    val currentPage: Int,
    val totalRecords: Int,
    val totalPages: Int,
    val items: List<BalanceMutation>
)
