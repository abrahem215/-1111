package com.airtype.ime

import android.inputmethodservice.InputMethodService
import android.view.KeyEvent
import android.view.View
import androidx.compose.runtime.*
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner

class AirTypeIME : InputMethodService(), LifecycleOwner, SavedStateRegistryOwner {

    private val lifecycleRegistry = LifecycleRegistry(this)
    private val savedStateRegistryController = SavedStateRegistryController.create(this)

    override val lifecycle: Lifecycle get() = lifecycleRegistry
    override val savedStateRegistry: SavedStateRegistry get() = savedStateRegistryController.savedStateRegistry

    private val gestureEngine = AndroidGestureEngine()
    private var cameraManager: CameraTrackingManager? = null
    private var landmarkerHelper: HandLandmarkerHelper? = null

    // Mutable states for Compose
    private var activeLayoutState = mutableStateOf(AndroidLayout.getArabicLayout())
    private var gestureState = mutableStateOf(AndroidGestureState.NO_HAND)
    private var hoveredKeyIdState = mutableStateOf<String?>(null)
    private var isAirTypingActiveState = mutableStateOf(false)

    override fun onCreate() {
        super.onCreate()
        savedStateRegistryController.performRestore(null)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
    }

    override fun onCreateInputView(): View {
        val composeView = ComposeView(this).apply {
            setViewTreeLifecycleOwner(this@AirTypeIME)
            setViewTreeSavedStateRegistryOwner(this@AirTypeIME)
            setContent {
                val layout by activeLayoutState
                val state by gestureState
                val hoveredId by hoveredKeyIdState
                val isAirActive by isAirTypingActiveState

                AirTypeKeyboardView(
                    layout = layout,
                    gestureState = state,
                    hoveredKeyId = hoveredId,
                    isAirTypingActive = isAirActive,
                    onToggleAirTyping = { toggleAirTyping() },
                    onToggleLanguage = { toggleLanguage() },
                    onEmergencyStop = { handleEmergencyStop() },
                    onKeyAction = { key -> executeKey(key) }
                )
            }
        }
        return composeView
    }

    override fun onStartInputView(info: android.view.inputmethod.EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)

        if (isAirTypingActiveState.value) {
            startCameraTracking()
        }
    }

    override fun onFinishInputView(finishingInput: Boolean) {
        super.onFinishInputView(finishingInput)
        stopCameraTracking()
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_PAUSE)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_STOP)
    }

    private fun startCameraTracking() {
        if (cameraManager == null) {
            landmarkerHelper = HandLandmarkerHelper(this) { handResult ->
                handleHandResult(handResult)
            }
            cameraManager = CameraTrackingManager(this) { bitmap ->
                landmarkerHelper?.detectLiveStream(bitmap)
            }
            cameraManager?.startCamera(this)
        }
    }

    private fun stopCameraTracking() {
        cameraManager?.stopCamera()
        cameraManager = null
        landmarkerHelper?.close()
        landmarkerHelper = null
        gestureState.value = AndroidGestureState.NO_HAND
        hoveredKeyIdState.value = null
    }

    private fun handleHandResult(result: AndroidHandResult) {
        val output = gestureEngine.process(result)
        gestureState.value = output.state

        if (output.smoothedCursor != null) {
            val key = hitTestKey(output.smoothedCursor.x, output.smoothedCursor.y)
            hoveredKeyIdState.value = key?.id

            if (output.clickEmitted && key != null) {
                executeKey(key)
            }
        } else {
            hoveredKeyIdState.value = null
        }
    }

    private fun hitTestKey(normX: Float, normY: Float): AndroidKey? {
        val layout = activeLayoutState.value
        val rows = layout.rows
        if (rows.isEmpty() || normX !in 0f..1f || normY !in 0f..1f) return null

        val rowIndex = (normY * rows.size).toInt().coerceIn(0, rows.size - 1)
        val row = rows[rowIndex]
        val totalWeights = row.keys.sumOf { it.widthWeight.toDouble() }.toFloat()

        var accumulated = 0f
        for (key in row.keys) {
            val keyWidthNorm = key.widthWeight / totalWeights
            if (normX >= accumulated && normX <= accumulated + keyWidthNorm) {
                return key
            }
            accumulated += keyWidthNorm
        }
        return null
    }

    private fun executeKey(key: AndroidKey) {
        val ic = currentInputConnection ?: return

        when (key.value) {
            "BACKSPACE" -> {
                val selected = ic.getSelectedText(0)
                if (selected.isNullOrEmpty()) {
                    ic.deleteSurroundingText(1, 0)
                } else {
                    ic.commitText("", 1)
                }
            }
            "SPACE" -> {
                ic.commitText(" ", 1)
            }
            "ENTER" -> {
                ic.sendKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER))
                ic.sendKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER))
            }
            "SWITCH_LANG" -> {
                toggleLanguage()
            }
            "CAPS_LOCK" -> {
                // Toggle uppercase/lowercase if English
            }
            else -> {
                // Normal character insertion (Unicode safe for Arabic)
                ic.commitText(key.value, 1)
            }
        }
    }

    private fun toggleLanguage() {
        activeLayoutState.value = if (activeLayoutState.value.language == "ar") {
            AndroidLayout.getEnglishLayout()
        } else {
            AndroidLayout.getArabicLayout()
        }
    }

    private fun toggleAirTyping() {
        val next = !isAirTypingActiveState.value
        isAirTypingActiveState.value = next
        gestureEngine.setArmed(next)

        if (next) {
            startCameraTracking()
        } else {
            stopCameraTracking()
        }
    }

    private fun handleEmergencyStop() {
        gestureEngine.triggerEmergencyStop()
        isAirTypingActiveState.value = false
        stopCameraTracking()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopCameraTracking()
        cameraManager?.release()
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
    }
}
