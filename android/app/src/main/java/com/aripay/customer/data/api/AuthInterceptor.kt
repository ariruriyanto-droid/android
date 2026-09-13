package com.aripay.customer.data.api

import com.aripay.customer.data.local.SecureSessionManager
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val sessionManager: SecureSessionManager
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val requestBuilder = originalRequest.newBuilder()
            .header("Accept", "application/json")

        // Suntikkan Bearer token jika user memiliki sesi aktif
        val token = sessionManager.getAuthToken()
        if (!token.isNullOrBlank()) {
            requestBuilder.header("Authorization", "Bearer $token")
        }

        val response = chain.proceed(requestBuilder.build())

        // Tangani HTTP 401 Unauthorized secara global: bersihkan sesi jika token expired
        if (response.code == 401) {
            sessionManager.clearSession()
        }

        return response
    }
}
