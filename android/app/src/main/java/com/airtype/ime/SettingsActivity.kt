package com.airtype.ime

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.view.inputmethod.InputMethodManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat

class SettingsActivity : ComponentActivity() {

    private var hasCameraPermission by mutableStateOf(false)

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        hasCameraPermission = isGranted
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        checkCameraPermission()

        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF090D16)
                ) {
                    SettingsScreen(
                        hasCameraPermission = hasCameraPermission,
                        onRequestCameraPermission = {
                            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
                        },
                        onOpenImeSettings = {
                            val intent = Intent(Settings.ACTION_INPUT_METHOD_SETTINGS)
                            startActivity(intent)
                        },
                        onOpenInputMethodPicker = {
                            val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
                            imm.showInputMethodPicker()
                        }
                    )
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        checkCameraPermission()
    }

    private fun checkCameraPermission() {
        hasCameraPermission = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }
}

@Composable
fun SettingsScreen(
    hasCameraPermission: Boolean,
    onRequestCameraPermission: () -> Unit,
    onOpenImeSettings: () -> Unit,
    onOpenInputMethodPicker: () -> Unit
) {
    var pinchThreshold by remember { mutableFloatStateOf(0.055f) }
    var smoothingAlpha by remember { mutableFloatStateOf(0.35f) }
    var cooldownMs by remember { mutableFloatStateOf(300f) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // App Header
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = "AirType AI — لوحة الكتابة في الهواء",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF38BDF8)
            )
            Text(
                text = "اكتب في الهواء، ودع كلماتك تظهر على الشاشة.",
                fontSize = 14.sp,
                color = Color(0xFF94A3B8)
            )
        }

        Divider(color = Color(0xFF1E293B))

        // Activation Steps Card
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "خطوات تفعيل لوحة المفاتيح",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                // Step 1: Enable in system
                Button(
                    onClick = onOpenImeSettings,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("1. تفعيل AirType AI في إعدادات النظام", color = Color(0xFF38BDF8))
                }

                // Step 2: Choose active keyboard
                Button(
                    onClick = onOpenInputMethodPicker,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("2. اختيار AirType AI كلوحة المفاتيح النشطة", color = Color(0xFF38BDF8))
                }

                // Step 3: Camera Permission
                Button(
                    onClick = onRequestCameraPermission,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (hasCameraPermission) Color(0xFF065F46) else Color(0xFF0284C7)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = if (hasCameraPermission) "✓ إذن الكاميرا ممنوح" else "3. منح إذن الكاميرا لتتبع حركة اليد",
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Gesture Calibration Card
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "معايير الحساسية والتنعيم",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                // Pinch threshold
                Column {
                    Text(
                        text = "مسافة ضم الأصابع للتأكيد: ${(pinchThreshold * 1000).toInt() / 1000f}",
                        fontSize = 13.sp,
                        color = Color(0xFFCBD5E1)
                    )
                    Slider(
                        value = pinchThreshold,
                        onValueChange = { pinchThreshold = it },
                        valueRange = 0.02f..0.12f,
                        colors = SliderDefaults.colors(thumbColor = Color(0xFF38BDF8), activeTrackColor = Color(0xFF0284C7))
                    )
                }

                // Smoothing alpha
                Column {
                    Text(
                        text = "معامل تنعيم المؤشر (Anti-jitter): ${(smoothingAlpha * 100).toInt() / 100f}",
                        fontSize = 13.sp,
                        color = Color(0xFFCBD5E1)
                    )
                    Slider(
                        value = smoothingAlpha,
                        onValueChange = { smoothingAlpha = it },
                        valueRange = 0.1f..0.8f,
                        colors = SliderDefaults.colors(thumbColor = Color(0xFF38BDF8), activeTrackColor = Color(0xFF0284C7))
                    )
                }

                // Cooldown ms
                Column {
                    Text(
                        text = "مهلة منع التكرار بين الحروف: ${cooldownMs.toInt()} ms",
                        fontSize = 13.sp,
                        color = Color(0xFFCBD5E1)
                    )
                    Slider(
                        value = cooldownMs,
                        onValueChange = { cooldownMs = it },
                        valueRange = 150f..800f,
                        colors = SliderDefaults.colors(thumbColor = Color(0xFF38BDF8), activeTrackColor = Color(0xFF0284C7))
                    )
                }
            }
        }

        // Privacy note
        Text(
            text = "ملاحظة الخصوصية: تتم معالجة صور الكاميرا محلياً على هاتفك فقط لتتبع حركة الأصابع، ولا يتم حفظ أي صور أو نقلها إلى أي خادم خارجي.",
            fontSize = 12.sp,
            color = Color(0xFF64748B)
        )
    }
}
