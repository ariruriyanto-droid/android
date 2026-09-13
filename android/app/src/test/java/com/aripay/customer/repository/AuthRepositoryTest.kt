package com.aripay.customer.repository

import com.aripay.customer.data.api.AuthApiService
import com.aripay.customer.data.api.model.AuthResponse
import com.aripay.customer.data.api.model.LoginRequest
import com.aripay.customer.data.api.model.RegisterRequest
import com.aripay.customer.data.api.model.UserDto
import com.aripay.customer.data.local.SecureSessionManager
import com.aripay.customer.data.repository.AuthRepositoryImpl
import com.aripay.customer.domain.model.Resource
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.runTest
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Response

class AuthRepositoryTest {

    private lateinit var apiService: AuthApiService
    private lateinit var sessionManager: SecureSessionManager
    private lateinit var repository: AuthRepositoryImpl

    @Before
    fun setup() {
        apiService = mockk(relaxed = true)
        sessionManager = mockk(relaxed = true)
        repository = AuthRepositoryImpl(apiService, sessionManager)
    }

    @Test
    fun login_Success_SavesTokenAndUserData() = runTest {
        val dummyToken = "jwt_mock_token_12345"
        val dummyUser = UserDto(id = 10, name = "Ahmad", phoneNumber = "081299998888")
        val authResponse = AuthResponse(success = true, token = dummyToken, user = dummyUser)

        coEvery { apiService.login(any()) } returns Response.success(authResponse)

        val results = repository.login("081299998888", "password123").toList()

        assertTrue(results[0] is Resource.Loading)
        assertTrue(results[1] is Resource.Success)

        verify { sessionManager.saveAuthToken(dummyToken) }
        verify { sessionManager.saveUserData(10, "Ahmad", "081299998888") }
    }

    @Test
    fun login_ApiError_EmitsErrorMessage() = runTest {
        val errorJson = "{\"success\":false,\"message\":\"Nomor HP atau kata sandi salah\"}"
        coEvery { apiService.login(any()) } returns Response.error(401, errorJson.toResponseBody())

        val results = repository.login("081299998888", "wrongpass").toList()

        assertTrue(results[0] is Resource.Loading)
        assertTrue(results[1] is Resource.Error)
        assertEquals("Nomor HP atau kata sandi salah", (results[1] as Resource.Error).message)
    }

    @Test
    fun logout_ClearsSessionLocally() = runTest {
        val results = repository.logout().toList()

        assertTrue(results[0] is Resource.Loading)
        assertTrue(results[1] is Resource.Success)

        verify { sessionManager.clearSession() }
    }
}
