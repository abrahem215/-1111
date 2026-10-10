package com.airtype.ime

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Keyboard
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material.icons.filled.VideocamOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun AirTypeKeyboardView(
    layout: AndroidLayout,
    gestureState: AndroidGestureState,
    hoveredKeyId: String?,
    isAirTypingActive: Boolean,
    onToggleAirTyping: () -> Unit,
    onToggleLanguage: () -> Unit,
    onEmergencyStop: () -> Unit,
    onKeyAction: (AndroidKey) -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .wrapContentHeight(),
        color = Color(0xFF090D16)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 6.dp, vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            // Status bar & quick controls
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp, vertical = 2.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Tracking Status Pill
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .background(Color(0xFF1E293B), RoundedCornerShape(12.dp))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    val statusColor = when (gestureState) {
                        AndroidGestureState.TRIGGERED,
                        AndroidGestureState.PINCH_POTENTIAL -> Color(0xFF22C55E)
                        AndroidGestureState.WAIT_RELEASE -> Color(0xFFEAB308)
                        AndroidGestureState.PALM_PAUSED -> Color(0xFF3B82F6)
                        AndroidGestureState.EMERGENCY_STOPPED -> Color(0xFFEF4444)
                        AndroidGestureState.IDLE -> Color(0xFF06B6D4)
                        AndroidGestureState.NO_HAND -> Color(0xFF64748B)
                    }

                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .background(statusColor, CircleShape)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = when (gestureState) {
                            AndroidGestureState.TRIGGERED -> "تأكيد الحرف!"
                            AndroidGestureState.PINCH_POTENTIAL -> "ضم الأصابع..."
                            AndroidGestureState.WAIT_RELEASE -> "تحرير الإصبع"
                            AndroidGestureState.PALM_PAUSED -> "كف مفتوح (توقف)"
                            AndroidGestureState.EMERGENCY_STOPPED -> "إيقاف طوارئ"
                            AndroidGestureState.IDLE -> "اليد جاهزة"
                            AndroidGestureState.NO_HAND -> "في انتظار اليد"
                        },
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                // Controls: Air Typing toggle, Language, Emergency Stop
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Toggle Air Typing Mode
                    IconButton(
                        onClick = onToggleAirTyping,
                        modifier = Modifier
                            .size(32.dp)
                            .background(
                                if (isAirTypingActive) Color(0xFF059669) else Color(0xFF334155),
                                CircleShape
                            )
                    ) {
                        Icon(
                            imageVector = if (isAirTypingActive) Icons.Default.Videocam else Icons.Default.VideocamOff,
                            contentDescription = "الكتابة في الهواء",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    // Language toggle
                    Button(
                        onClick = onToggleLanguage,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        modifier = Modifier.height(30.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = if (layout.language == "ar") "AR" else "EN",
                            color = Color(0xFF38BDF8),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // Emergency Stop button
                    Button(
                        onClick = onEmergencyStop,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        modifier = Modifier.height(30.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "🛑 إيقاف",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Keyboard Rows
            layout.rows.forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    row.keys.forEach { key ->
                        val isHovered = (hoveredKeyId == key.id)
                        val animatedBg by animateColorAsState(
                            targetValue = when {
                                isHovered -> Color(0xFF0EA5E9)
                                key.type == KeyType.ACTION -> Color(0xFF1E293B)
                                else -> Color(0xFF18202F)
                            },
                            animationSpec = tween(durationMillis = 150),
                            label = "keyBg"
                        )

                        Box(
                            modifier = Modifier
                                .weight(key.widthWeight)
                                .height(46.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(animatedBg)
                                .border(
                                    width = if (isHovered) 1.5.dp else 0.5.dp,
                                    color = if (isHovered) Color(0xFFE0F2FE) else Color(0xFF334155),
                                    shape = RoundedCornerShape(6.dp)
                                )
                                .clickable { onKeyAction(key) },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = key.label,
                                color = if (isHovered) Color.White else Color(0xFFF1F5F9),
                                fontSize = if (key.label.length <= 2) 16.sp else 12.sp,
                                fontWeight = if (isHovered) FontWeight.Bold else FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }
    }
}
