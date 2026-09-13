package com.aripay.customer.ui.screens.register

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aripay.customer.ui.common.UiState
import com.aripay.customer.ui.theme.BackgroundLight
import com.aripay.customer.ui.theme.BorderLight
import com.aripay.customer.ui.theme.ErrorRed
import com.aripay.customer.ui.theme.PrimaryBlue
import com.aripay.customer.ui.theme.SurfaceLight
import com.aripay.customer.ui.theme.TextPrimary
import com.aripay.customer.ui.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    viewModel: RegisterViewModel,
    onRegisterSuccess: () -> Unit,
    onNavigateBackToLogin: () -> Unit
) {
    val formState by viewModel.formState.collectAsState()
    val registerState by viewModel.registerState.collectAsState()
    val focusManager = LocalFocusManager.current
    var passwordVisible by remember { mutableStateOf(false) }
    var confirmPasswordVisible by remember { mutableStateOf(false) }

    LaunchedEffect(registerState) {
        if (registerState is UiState.Success) {
            onRegisterSuccess()
            viewModel.resetState()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Daftar Akun", fontSize = 18.sp, fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBackToLogin) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Kembali")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SurfaceLight,
                    titleContentColor = TextPrimary
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(BackgroundLight)
                .padding(paddingValues)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Bergabung dengan AriPay",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    modifier = Modifier.align(Alignment.Start)
                )
                Text(
                    text = "Daftar sekarang untuk kemudahan transaksi pulsa & tagihan",
                    fontSize = 14.sp,
                    color = TextSecondary,
                    modifier = Modifier
                        .align(Alignment.Start)
                        .padding(top = 4.dp, bottom = 20.dp)
                )

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceLight),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {

                        if (registerState is UiState.Error) {
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 16.dp),
                                shape = RoundedCornerShape(8.dp),
                                color = ErrorRed.copy(alpha = 0.1f)
                            ) {
                                Text(
                                    text = (registerState as UiState.Error).message,
                                    color = ErrorRed,
                                    fontSize = 13.sp,
                                    modifier = Modifier.padding(12.dp)
                                )
                            }
                        }

                        // Nama Lengkap
                        Text("Nama Lengkap", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
                        Spacer(modifier = Modifier.height(6.dp))
                        OutlinedTextField(
                            value = formState.name,
                            onValueChange = { viewModel.onNameChanged(it) },
                            placeholder = { Text("Masukkan nama lengkap Anda") },
                            leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = TextSecondary) },
                            isError = formState.nameError != null,
                            supportingText = { if (formState.nameError != null) Text(formState.nameError!!, color = ErrorRed) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = PrimaryBlue,
                                unfocusedBorderColor = BorderLight
                            )
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Nomor Handphone
                        Text("Nomor Handphone", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
                        Spacer(modifier = Modifier.height(6.dp))
                        OutlinedTextField(
                            value = formState.phoneNumber,
                            onValueChange = { viewModel.onPhoneNumberChanged(it) },
                            placeholder = { Text("08xxxxxxxxxx") },
                            leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = TextSecondary) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next),
                            isError = formState.phoneNumberError != null,
                            supportingText = { if (formState.phoneNumberError != null) Text(formState.phoneNumberError!!, color = ErrorRed) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = PrimaryBlue,
                                unfocusedBorderColor = BorderLight
                            )
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Kata Sandi
                        Text("Kata Sandi", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
                        Spacer(modifier = Modifier.height(6.dp))
                        OutlinedTextField(
                            value = formState.password,
                            onValueChange = { viewModel.onPasswordChanged(it) },
                            placeholder = { Text("Minimal 6 karakter") },
                            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = TextSecondary) },
                            trailingIcon = {
                                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                    Icon(
                                        imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                        contentDescription = null,
                                        tint = TextSecondary
                                    )
                                }
                            },
                            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Next),
                            isError = formState.passwordError != null,
                            supportingText = { if (formState.passwordError != null) Text(formState.passwordError!!, color = ErrorRed) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = PrimaryBlue,
                                unfocusedBorderColor = BorderLight
                            )
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Konfirmasi Kata Sandi
                        Text("Konfirmasi Kata Sandi", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
                        Spacer(modifier = Modifier.height(6.dp))
                        OutlinedTextField(
                            value = formState.confirmPassword,
                            onValueChange = { viewModel.onConfirmPasswordChanged(it) },
                            placeholder = { Text("Ulangi kata sandi") },
                            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = TextSecondary) },
                            trailingIcon = {
                                IconButton(onClick = { confirmPasswordVisible = !confirmPasswordVisible }) {
                                    Icon(
                                        imageVector = if (confirmPasswordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                        contentDescription = null,
                                        tint = TextSecondary
                                    )
                                }
                            },
                            visualTransformation = if (confirmPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                            keyboardActions = KeyboardActions(onDone = {
                                focusManager.clearFocus()
                                viewModel.register()
                            }),
                            isError = formState.confirmPasswordError != null,
                            supportingText = { if (formState.confirmPasswordError != null) Text(formState.confirmPasswordError!!, color = ErrorRed) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = PrimaryBlue,
                                unfocusedBorderColor = BorderLight
                            )
                        )

                        Spacer(modifier = Modifier.height(20.dp))

                        val isLoading = registerState is UiState.Loading
                        Button(
                            onClick = {
                                focusManager.clearFocus()
                                viewModel.register()
                            },
                            enabled = formState.isFormValid && !isLoading,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = PrimaryBlue,
                                disabledContainerColor = PrimaryBlue.copy(alpha = 0.4f)
                            )
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(22.dp))
                            } else {
                                Text("Daftar Akun AriPay", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Sudah memiliki akun?", fontSize = 14.sp, color = TextSecondary)
                    Spacer(modifier = Modifier.width(4.dp))
                    TextButton(onClick = onNavigateBackToLogin) {
                        Text("Masuk", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = PrimaryBlue)
                    }
                }
            }
        }
    }
}
