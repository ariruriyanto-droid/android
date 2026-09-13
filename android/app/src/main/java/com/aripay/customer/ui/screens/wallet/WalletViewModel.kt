package com.aripay.customer.ui.screens.wallet

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aripay.customer.domain.model.MutationPage
import com.aripay.customer.domain.model.Resource
import com.aripay.customer.domain.model.WalletBalance
import com.aripay.customer.domain.repository.WalletRepository
import com.aripay.customer.ui.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WalletViewModel @Inject constructor(
    private val walletRepository: WalletRepository
) : ViewModel() {

    private val _balanceState = MutableStateFlow<UiState<WalletBalance>>(UiState.Idle)
    val balanceState = _balanceState.asStateFlow()

    private val _mutationsState = MutableStateFlow<UiState<MutationPage>>(UiState.Idle)
    val mutationsState = _mutationsState.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing = _isRefreshing.asStateFlow()

    init {
        loadWalletData()
    }

    fun loadWalletData() {
        fetchBalance()
        fetchMutations(page = 1)
    }

    fun refresh() {
        _isRefreshing.value = true
        viewModelScope.launch {
            launch { fetchBalance() }
            launch { fetchMutations(page = 1) }
            _isRefreshing.value = false
        }
    }

    fun fetchBalance() {
        viewModelScope.launch {
            walletRepository.getBalance().collect { result ->
                when (result) {
                    is Resource.Loading -> {
                        if (_balanceState.value !is UiState.Success) {
                            _balanceState.value = UiState.Loading
                        }
                    }
                    is Resource.Success -> {
                        _balanceState.value = UiState.Success(result.data)
                    }
                    is Resource.Error -> {
                        _balanceState.value = UiState.Error(result.message, result.statusCode)
                    }
                }
            }
        }
    }

    fun fetchMutations(page: Int = 1) {
        viewModelScope.launch {
            walletRepository.getMutations(page = page, limit = 20).collect { result ->
                when (result) {
                    is Resource.Loading -> {
                        if (_mutationsState.value !is UiState.Success) {
                            _mutationsState.value = UiState.Loading
                        }
                    }
                    is Resource.Success -> {
                        _mutationsState.value = UiState.Success(result.data)
                    }
                    is Resource.Error -> {
                        _mutationsState.value = UiState.Error(result.message, result.statusCode)
                    }
                }
            }
        }
    }
}
