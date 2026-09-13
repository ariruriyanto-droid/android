package com.aripay.customer.data.repository

import com.aripay.customer.data.api.WalletApiService
import com.aripay.customer.domain.model.BalanceMutation
import com.aripay.customer.domain.model.MutationPage
import com.aripay.customer.domain.model.MutationType
import com.aripay.customer.domain.model.Resource
import com.aripay.customer.domain.model.WalletBalance
import com.aripay.customer.domain.repository.WalletRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import org.json.JSONObject
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WalletRepositoryImpl @Inject constructor(
    private val apiService: WalletApiService
) : WalletRepository {

    override suspend fun getBalance(): Flow<Resource<WalletBalance>> = flow {
        emit(Resource.Loading)
        try {
            val response = apiService.getBalance()
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    emit(
                        Resource.Success(
                            WalletBalance(
                                userId = data.userId,
                                fullName = data.fullName,
                                phoneNumber = data.phoneNumber,
                                balance = data.balance
                            )
                        )
                    )
                } else {
                    emit(Resource.Error("Data saldo kosong dari server."))
                }
            } else {
                val errorMessage = parseErrorMessage(response.errorBody()?.string())
                    ?: response.body()?.message
                    ?: "Gagal memuat saldo akun."
                emit(Resource.Error(errorMessage, response.code()))
            }
        } catch (e: IOException) {
            emit(Resource.Error("Koneksi bermasalah. Periksa jaringan internet Anda."))
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Terjadi kesalahan saat memuat saldo."))
        }
    }

    override suspend fun getMutations(page: Int, limit: Int): Flow<Resource<MutationPage>> = flow {
        emit(Resource.Loading)
        try {
            val response = apiService.getMutations(page, limit)
            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()!!
                val pagination = body.pagination
                val items = body.data.map { dto ->
                    BalanceMutation(
                        id = dto.id,
                        type = if (dto.type.equals("DEBIT", ignoreCase = true)) MutationType.DEBIT else MutationType.CREDIT,
                        amount = dto.amount,
                        balanceBefore = dto.balanceBefore,
                        balanceAfter = dto.balanceAfter,
                        referenceType = dto.referenceType,
                        referenceId = dto.referenceId,
                        description = dto.description,
                        createdAt = dto.createdAt
                    )
                }

                emit(
                    Resource.Success(
                        MutationPage(
                            currentPage = pagination?.currentPage ?: page,
                            totalRecords = pagination?.totalRecords ?: items.size,
                            totalPages = pagination?.totalPages ?: 1,
                            items = items
                        )
                    )
                )
            } else {
                val errorMessage = parseErrorMessage(response.errorBody()?.string())
                    ?: response.body()?.message
                    ?: "Gagal memuat riwayat mutasi saldo."
                emit(Resource.Error(errorMessage, response.code()))
            }
        } catch (e: IOException) {
            emit(Resource.Error("Koneksi gagal. Periksa jaringan internet Anda."))
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Terjadi kesalahan saat memuat mutasi."))
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
