package com.aripay.customer.data.api

import com.aripay.customer.data.api.model.BalanceResponse
import com.aripay.customer.data.api.model.MutationsResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface WalletApiService {

    @GET("api/wallet/balance")
    suspend fun getBalance(): Response<BalanceResponse>

    @GET("api/wallet/mutations")
    suspend fun getMutations(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<MutationsResponse>
}
