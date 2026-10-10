package com.airtype.ime

import kotlin.math.sqrt

enum class AndroidGestureState {
    NO_HAND,
    IDLE,
    PINCH_POTENTIAL,
    TRIGGERED,
    WAIT_RELEASE,
    PALM_PAUSED,
    EMERGENCY_STOPPED
}

data class NormalizedPoint(val x: Float, val y: Float)

data class AndroidHandResult(
    val detected: Boolean,
    val indexTip: NormalizedPoint?,
    val thumbTip: NormalizedPoint?,
    val pinchDistance: Float,
    val isOpenPalm: Boolean
)

class AndroidEMACursorFilter(var alpha: Float = 0.35f) {
    private var filteredX: Float? = null
    private var filteredY: Float? = null

    fun filter(x: Float, y: Float): NormalizedPoint {
        val fx = filteredX
        val fy = filteredY
        return if (fx == null || fy == null) {
            filteredX = x
            filteredY = y
            NormalizedPoint(x, y)
        } else {
            val nx = alpha * x + (1.0f - alpha) * fx
            val ny = alpha * y + (1.0f - alpha) * fy
            filteredX = nx
            filteredY = ny
            NormalizedPoint(nx, ny)
        }
    }

    fun reset() {
        filteredX = null
        filteredY = null
    }
}

class AndroidGestureEngine(
    var pinchThreshold: Float = 0.055f,
    var releaseThreshold: Float = 0.085f,
    var minHoldMs: Long = 100L,
    var cooldownMs: Long = 300L,
    smoothingAlpha: Float = 0.35f
) {
    var state: AndroidGestureState = AndroidGestureState.NO_HAND
        private set

    val cursorFilter = AndroidEMACursorFilter(smoothingAlpha)

    private var pinchStartTime: Long? = null
    private var lastTriggerTime: Long = 0L
    private var isEmergencyStopped: Boolean = false
    private var isArmed: Boolean = true

    fun setArmed(armed: Boolean) {
        isArmed = armed
        if (!armed) {
            state = AndroidGestureState.IDLE
            pinchStartTime = null
        }
    }

    fun isArmed(): Boolean = isArmed

    fun triggerEmergencyStop() {
        isEmergencyStopped = true
        state = AndroidGestureState.EMERGENCY_STOPPED
        isArmed = false
    }

    fun resetEmergencyStop() {
        isEmergencyStopped = false
        state = AndroidGestureState.IDLE
    }

    data class ProcessOutput(
        val state: AndroidGestureState,
        val smoothedCursor: NormalizedPoint?,
        val clickEmitted: Boolean
    )

    fun process(result: AndroidHandResult, currentTimeMs: Long = System.currentTimeMillis()): ProcessOutput {
        if (isEmergencyStopped) {
            return ProcessOutput(AndroidGestureState.EMERGENCY_STOPPED, null, false)
        }

        if (!result.detected || result.indexTip == null) {
            state = AndroidGestureState.NO_HAND
            pinchStartTime = null
            cursorFilter.reset()
            return ProcessOutput(AndroidGestureState.NO_HAND, null, false)
        }

        val smoothed = cursorFilter.filter(result.indexTip.x, result.indexTip.y)

        if (result.isOpenPalm) {
            state = AndroidGestureState.PALM_PAUSED
            pinchStartTime = null
            return ProcessOutput(AndroidGestureState.PALM_PAUSED, smoothed, false)
        }

        if (!isArmed) {
            state = AndroidGestureState.IDLE
            return ProcessOutput(AndroidGestureState.IDLE, smoothed, false)
        }

        var clickEmitted = false
        val dist = result.pinchDistance

        when (state) {
            AndroidGestureState.IDLE,
            AndroidGestureState.NO_HAND,
            AndroidGestureState.PALM_PAUSED -> {
                if (dist <= pinchThreshold) {
                    if (currentTimeMs - lastTriggerTime >= cooldownMs) {
                        state = AndroidGestureState.PINCH_POTENTIAL
                        pinchStartTime = currentTimeMs
                    }
                } else {
                    state = AndroidGestureState.IDLE
                }
            }

            AndroidGestureState.PINCH_POTENTIAL -> {
                if (dist > pinchThreshold) {
                    // Aborted before threshold
                    state = AndroidGestureState.IDLE
                    pinchStartTime = null
                } else {
                    val start = pinchStartTime ?: currentTimeMs
                    if (currentTimeMs - start >= minHoldMs) {
                        // Pinch confirmed! Trigger exactly once!
                        state = AndroidGestureState.TRIGGERED
                        lastTriggerTime = currentTimeMs
                        clickEmitted = true
                        state = AndroidGestureState.WAIT_RELEASE
                    }
                }
            }

            AndroidGestureState.WAIT_RELEASE -> {
                // Must release beyond release threshold to prevent accidental repeat
                if (dist >= releaseThreshold) {
                    state = AndroidGestureState.IDLE
                    pinchStartTime = null
                }
            }

            AndroidGestureState.TRIGGERED -> {
                state = AndroidGestureState.WAIT_RELEASE
            }

            AndroidGestureState.EMERGENCY_STOPPED -> {
                // Handled above
            }
        }

        return ProcessOutput(state, smoothed, clickEmitted)
    }
}
