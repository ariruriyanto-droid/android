package com.aripay.customer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.aripay.customer.ui.navigation.AriPayNavGraph
import com.aripay.customer.ui.theme.AriPayTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AriPayTheme {
                AriPayNavGraph()
            }
        }
    }
}
