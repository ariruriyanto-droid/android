package com.aripay.customer.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.material3.MaterialTheme

val PrimaryBlue = Color(0xFF1E3A8A)
val PrimaryLight = Color(0xFF2563EB)
val SecondaryGreen = Color(0xFF0D9488)
val AccentOrange = Color(0xFFF97316)
val BackgroundLight = Color(0xFFF8FAFC)
val SurfaceLight = Color(0xFFFFFFFF)
val TextPrimary = Color(0xFF0F172A)
val TextSecondary = Color(0xFF64748B)
val BorderLight = Color(0xFFE2E8F0)
val ErrorRed = Color(0xFFDC2626)
val SuccessGreen = Color(0xFF16A34A)

private val LightColorScheme = lightColorScheme(
    primary = PrimaryBlue,
    onPrimary = Color.White,
    secondary = SecondaryGreen,
    onSecondary = Color.White,
    background = BackgroundLight,
    surface = SurfaceLight,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    error = ErrorRed,
    onError = Color.White
)

@Composable
fun AriPayTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = Typography(),
        content = content
    )
}
