package com.aripay.customer.data.local

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SecureSessionManager @Inject constructor(
    @ApplicationContext context: Context
) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences = EncryptedSharedPreferences.create(
        context,
        PREFS_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveAuthToken(token: String) {
        sharedPreferences.edit().putString(KEY_AUTH_TOKEN, token).apply()
    }

    fun getAuthToken(): String? {
        return sharedPreferences.getString(KEY_AUTH_TOKEN, null)
    }

    fun saveUserData(userId: Int, name: String, phone: String) {
        sharedPreferences.edit()
            .putInt(KEY_USER_ID, userId)
            .putString(KEY_USER_NAME, name)
            .putString(KEY_USER_PHONE, phone)
            .apply()
    }

    fun getUserId(): Int = sharedPreferences.getInt(KEY_USER_ID, -1)
    fun getUserName(): String? = sharedPreferences.getString(KEY_USER_NAME, null)
    fun getUserPhone(): String? = sharedPreferences.getString(KEY_USER_PHONE, null)

    fun clearSession() {
        sharedPreferences.edit().clear().apply()
    }

    fun hasValidSession(): Boolean {
        val token = getAuthToken()
        return !token.isNullOrBlank()
    }

    companion object {
        private const val PREFS_NAME = "aripay_secure_session_prefs"
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_PHONE = "user_phone"
    }
}
