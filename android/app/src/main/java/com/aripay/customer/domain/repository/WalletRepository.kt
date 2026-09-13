package com.aripay.customer.domain.repository

import com.aripay.customer.domain.model.MutationPage
import com.aripay.customer.domain.model.Resource
import com.aripay.customer.domain.model.WalletBalance
import kotlinx.coroutines.flow.Flow

interface WalletRepository {
    suspend fun getBalance(): Flow<Resource<WalletBalance>>
    suspend fun getMutations(page: Int = 1, limit: Int = 20): Flow<Resource<MutationPage>>
}
