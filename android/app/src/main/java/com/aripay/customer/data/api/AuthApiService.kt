package com.aripay.customer.data.api

import com.aripay.customer.data.api.model.AuthResponse
import com.aripay.customer.data.api.model.GenericApiResponse
import com.aripay.customer.data.api.model.LoginRequest
import com.aripay.customer.data.api.model.RegisterRequest
import com.aripay.customer.data.api.model.UserProfileResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AuthApiService {

    @POST("api/auth/register")
    suspend fun register(
        @Body request: RegisterRequest
    ): Response<AuthResponse>

    @POST("api/auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<AuthResponse>

    @POST("api/auth/logout")
    suspend fun logout(): Response<GenericApiResponse>

    @GET("api/auth/me")
    suspend fun getProfile(): Response<UserProfileResponse>
}
