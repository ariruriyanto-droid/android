package com.aripay.customer.repository

import com.aripay.customer.data.api.WalletApiService
import com.aripay.customer.data.api.model.BalanceDataDto
import com.aripay.customer.data.api.model.BalanceResponse
import com.aripay.customer.data.api.model.MutationDto
import com.aripay.customer.data.api.model.MutationsResponse
import com.aripay.customer.data.api.model.PaginationDto
import com.aripay.customer.data.repository.WalletRepositoryImpl
import com.aripay.customer.domain.model.MutationType
import com.aripay.customer.domain.model.Resource
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.runTest
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Response

class WalletRepositoryTest {

    private lateinit var apiService: WalletApiService
    private lateinit var repository: WalletRepositoryImpl

    @Before
    fun setup() {
        apiService = mockk(relaxed = true)
        repository = WalletRepositoryImpl(apiService)
    }

    @Test
    fun getBalance_Success_EmitsWalletBalance() = runTest {
        val fakeData = BalanceDataDto(
            userId = 1,
            fullName = "Ahmad Customer",
            phoneNumber = "08123456789",
            balance = 150000.0
        )
        val response = BalanceResponse(success = true, data = fakeData)
        coEvery { apiService.getBalance() } returns Response.success(response)

        val results = repository.getBalance().toList()

        assertEquals(2, results.size)
        assertTrue(results[0] is Resource.Loading)
        assertTrue(results[1] is Resource.Success)

        val data = (results[1] as Resource.Success).data
        assertEquals(1, data.userId)
        assertEquals("Ahmad Customer", data.fullName)
        assertEquals(150000.0, data.balance, 0.01)
    }

    @Test
    fun getBalance_Error_EmitsErrorMessage() = runTest {
        val errorJson = "{\"success\":false,\"message\":\"Sesi kedaluwarsa\"}"
        coEvery { apiService.getBalance() } returns Response.error(401, errorJson.toResponseBody())

        val results = repository.getBalance().toList()

        assertTrue(results[0] is Resource.Loading)
        assertTrue(results[1] is Resource.Error)
        assertEquals("Sesi kedaluwarsa", (results[1] as Resource.Error).message)
    }

    @Test
    fun getMutations_Success_ParsesCreditAndDebitCorrectly() = runTest {
        val items = listOf(
            MutationDto(
                id = 101,
                type = "CREDIT",
                amount = 50000.0,
                balanceBefore = 0.0,
                balanceAfter = 50000.0,
                referenceType = "DEPOSIT",
                referenceId = "DEP-101",
                description = "Pengisian Saldo",
                createdAt = "2026-09-11 12:00:00"
            ),
            MutationDto(
                id = 102,
                type = "DEBIT",
                amount = 10000.0,
                balanceBefore = 50000.0,
                balanceAfter = 40000.0,
                referenceType = "PURCHASE",
                referenceId = "TRX-102",
                description = "Pembelian Pulsa",
                createdAt = "2026-09-11 12:30:00"
            )
        )
        val pagination = PaginationDto(currentPage = 1, totalRecords = 2, totalPages = 1)
        val response = MutationsResponse(success = true, pagination = pagination, data = items)

        coEvery { apiService.getMutations(1, 20) } returns Response.success(response)

        val results = repository.getMutations(1, 20).toList()

        assertTrue(results[0] is Resource.Loading)
        assertTrue(results[1] is Resource.Success)

        val page = (results[1] as Resource.Success).data
        assertEquals(2, page.items.size)
        assertEquals(MutationType.CREDIT, page.items[0].type)
        assertEquals(MutationType.DEBIT, page.items[1].type)
        assertEquals(40000.0, page.items[1].balanceAfter, 0.01)
    }

    @Test
    fun getMutations_EmptyList_ReturnsEmptyItems() = runTest {
        val pagination = PaginationDto(currentPage = 1, totalRecords = 0, totalPages = 0)
        val response = MutationsResponse(success = true, pagination = pagination, data = emptyList())

        coEvery { apiService.getMutations(1, 20) } returns Response.success(response)

        val results = repository.getMutations(1, 20).toList()

        assertTrue(results[1] is Resource.Success)
        val page = (results[1] as Resource.Success).data
        assertTrue(page.items.isEmpty())
    }
}
