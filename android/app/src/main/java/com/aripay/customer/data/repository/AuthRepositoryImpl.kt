package com.aripay.customer.data.repository

import com.aripay.customer.data.api.AuthApiService
import com.aripay.customer.data.api.model.LoginRequest
import com.aripay.customer.data.api.model.RegisterRequest
import com.aripay.customer.data.local.SecureSessionManager
import com.aripay.customer.domain.model.Resource
import com.aripay.customer.domain.model.User
import com.aripay.customer.domain.repository.AuthRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import org.json.JSONObject
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val apiService: AuthApiService,
    private val sessionManager: SecureSessionManager
) : AuthRepository {

    override suspend fun register(
        name: String,
        phone: String,
        password: String
    ): Flow<Resource<String>> = flow {
        emit(Resource.Loading)
        try {
            val response = apiService.register(
                RegisterRequest(
                    name = name.trim(),
                    phoneNumber = phone.trim(),
                    password = password
                )
            )

            if (response.isSuccessful && response.body()?.success == true) {
                val successMessage = response.body()?.message ?: "Registrasi akun AriPay berhasil."
                emit(Resource.Success(successMessage))
            } else {
                val errorMessage = parseErrorMessage(response.errorBody()?.string())
                    ?: response.body()?.message
                    ?: "Registrasi gagal, periksa data Anda."
                emit(Resource.Error(errorMessage, response.code()))
            }
        } catch (e: IOException) {
            emit(Resource.Error("Koneksi internet bermasalah. Periksa jaringan Anda."))
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Terjadi kesalahan internal pada aplikasi."))
        }
    }

    override suspend fun login(
        phone: String,
        password: String
    ): Flow<Resource<User>> = flow {
        emit(Resource.Loading)
        try {
            val response = apiService.login(
                LoginRequest(
                    phoneNumber = phone.trim(),
                    password = password
                )
            )

            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()!!
                val token = body.token
                val userDto = body.user

                if (!token.isNullOrBlank() && userDto != null) {
                    sessionManager.saveAuthToken(token)
                    sessionManager.saveUserData(userDto.id, userDto.name, userDto.phoneNumber)

                    val user = User(
                        id = userDto.id,
                        name = userDto.name,
                        phoneNumber = userDto.phoneNumber,
                        role = userDto.role ?: "MEMBER",
                        isActive = userDto.isActive ?: true
                    )
                    emit(Resource.Success(user))
                } else {
                    emit(Resource.Error("Respon login tidak lengkap dari server."))
                }
            } else {
                val errorMessage = parseErrorMessage(response.errorBody()?.string())
                    ?: response.body()?.message
                    ?: "Nomor HP atau kata sandi tidak sesuai."
                emit(Resource.Error(errorMessage, response.code()))
            }
        } catch (e: IOException) {
            emit(Resource.Error("Koneksi gagal. Pastikan ponsel Anda terhubung ke internet."))
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Terjadi kesalahan saat memproses login."))
        }
    }

    override suspend fun getProfile(): Flow<Resource<User>> = flow {
        emit(Resource.Loading)
        try {
            val response = apiService.getProfile()

            if (response.isSuccessful && response.body()?.success == true) {
                val userDto = response.body()!!.user
                if (userDto != null) {
                    sessionManager.saveUserData(userDto.id, userDto.name, userDto.phoneNumber)
                    val user = User(
                        id = userDto.id,
                        name = userDto.name,
                        phoneNumber = userDto.phoneNumber,
                        role = userDto.role ?: "MEMBER",
                        isActive = userDto.isActive ?: true
                    )
                    emit(Resource.Success(user))
                } else {
                    emit(Resource.Error("Data profil tidak ditemukan."))
                }
            } else {
                val errorMessage = parseErrorMessage(response.errorBody()?.string())
                    ?: response.body()?.message
                    ?: "Sesi kedaluwarsa, silakan masuk kembali."
                emit(Resource.Error(errorMessage, response.code()))
            }
        } catch (e: IOException) {
            // Jika offline namun ada data cache lokal
            val cached = getCachedUser()
            if (cached != null) {
                emit(Resource.Success(cached))
            } else {
                emit(Resource.Error("Gagal memuat profil secara offline."))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Gagal memuat profil pengguna."))
        }
    }

    override suspend fun logout(): Flow<Resource<Unit>> = flow {
        emit(Resource.Loading)
        try {
            apiService.logout() // Best-effort logout di backend
        } catch (_: Exception) {
            // Abaikan kegagalan jaringan saat logout; pembersihan lokal tetap wajib
        } finally {
            sessionManager.clearSession()
            emit(Resource.Success(Unit))
        }
    }

    override fun isSessionActive(): Boolean = sessionManager.hasValidSession()

    override fun getCachedUser(): User? {
        val id = sessionManager.getUserId()
        val name = sessionManager.getUserName()
        val phone = sessionManager.getUserPhone()

        return if (id != -1 && !name.isNullOrBlank() && !phone.isNullOrBlank()) {
            User(id = id, name = name, phoneNumber = phone)
        } else {
            null
        }
    }

    private fun parseErrorMessage(errorBody: String?): String? {
        if (errorBody.isNullOrBlank()) return null
        return try {
            val json = JSONObject(errorBody)
            json.optString("message", null)
        } catch (_: Exception) {
            null
        }
    }
}
