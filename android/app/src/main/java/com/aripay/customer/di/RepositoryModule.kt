package com.aripay.customer.di

import com.aripay.customer.data.repository.AuthRepositoryImpl
import com.aripay.customer.data.repository.WalletRepositoryImpl
import com.aripay.customer.domain.repository.AuthRepository
import com.aripay.customer.domain.repository.WalletRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindAuthRepository(
        authRepositoryImpl: AuthRepositoryImpl
    ): AuthRepository

    @Binds
    @Singleton
    abstract fun bindWalletRepository(
        walletRepositoryImpl: WalletRepositoryImpl
    ): WalletRepository
}
