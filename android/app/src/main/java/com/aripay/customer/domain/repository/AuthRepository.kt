package com.aripay.customer.domain.repository

import com.aripay.customer.domain.model.Resource
import com.aripay.customer.domain.model.User
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    suspend fun register(name: String, phone: String, password: String): Flow<Resource<String>>
    suspend fun login(phone: String, password: String): Flow<Resource<User>>
    suspend fun getProfile(): Flow<Resource<User>>
    suspend fun logout(): Flow<Resource<Unit>>
    fun isSessionActive(): Boolean
    fun getCachedUser(): User?
}
