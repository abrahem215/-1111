package com.airtype.ime

import android.content.Context
import android.graphics.Bitmap
import android.os.SystemClock
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarkerResult
import kotlin.math.sqrt

class HandLandmarkerHelper(
    val context: Context,
    val onResultListener: (AndroidHandResult) -> Unit
) {
    private var handLandmarker: HandLandmarker? = null

    init {
        setupHandLandmarker()
    }

    private fun setupHandLandmarker() {
        val baseOptionsBuilder = BaseOptions.builder()
            .setModelAssetPath("hand_landmarker.task")

        val optionsBuilder = HandLandmarker.HandLandmarkerOptions.builder()
            .setBaseOptions(baseOptionsBuilder.build())
            .setMinHandDetectionConfidence(0.6f)
            .setMinTrackingConfidence(0.5f)
            .setMinHandPresenceConfidence(0.5f)
            .setNumHands(1)
            .setRunningMode(RunningMode.LIVE_STREAM)
            .setResultListener { result: HandLandmarkerResult, _ ->
                processLandmarkerResult(result)
            }
            .setErrorListener { error ->
                // Fallback gracefully on parsing/device issues
            }

        try {
            handLandmarker = HandLandmarker.createFromOptions(context, optionsBuilder.build())
        } catch (e: Exception) {
            // Log or fallback
        }
    }

    fun detectLiveStream(bitmap: Bitmap) {
        val mpImage = BitmapImageBuilder(bitmap).build()
        val frameTime = SystemClock.uptimeMillis()
        handLandmarker?.detectAsync(mpImage, frameTime)
    }

    private fun processLandmarkerResult(result: HandLandmarkerResult) {
        val landmarks = result.landmarks()
        if (landmarks.isEmpty() || landmarks[0].isEmpty()) {
            onResultListener(AndroidHandResult(false, null, null, 1.0f, false))
            return
        }

        val handLms = landmarks[0]
        if (handLms.size < 21) {
            onResultListener(AndroidHandResult(false, null, null, 1.0f, false))
            return
        }

        // MediaPipe landmarks: 0 = Wrist, 4 = Thumb Tip, 8 = Index Tip
        val thumb = handLms[4]
        val index = handLms[8]
        val wrist = handLms[0]

        // On front-facing camera, mirror X axis so moving right physically moves cursor right
        val normIndex = NormalizedPoint(1.0f - index.x(), index.y())
        val normThumb = NormalizedPoint(1.0f - thumb.x(), thumb.y())

        val dx = normIndex.x - normThumb.x
        val dy = normIndex.y - normThumb.y
        val pinchDist = sqrt(dx * dx + dy * dy)

        // Open palm check: all 4 fingertips extended away from wrist
        var extendedCount = 0
        val tipPipPairs = listOf(Pair(8, 6), Pair(12, 10), Pair(16, 14), Pair(20, 18))
        for (pair in tipPipPairs) {
            val tip = handLms[pair.first]
            val pip = handLms[pair.second]
            val distTip = (tip.x() - wrist.x()) * (tip.x() - wrist.x()) + (tip.y() - wrist.y()) * (tip.y() - wrist.y())
            val distPip = (pip.x() - wrist.x()) * (pip.x() - wrist.x()) + (pip.y() - wrist.y()) * (pip.y() - wrist.y())
            if (distTip > distPip) {
                extendedCount++
            }
        }
        val isOpenPalm = extendedCount >= 4

        onResultListener(
            AndroidHandResult(
                detected = true,
                indexTip = normIndex,
                thumbTip = normThumb,
                pinchDistance = pinchDist,
                isOpenPalm = isOpenPalm
            )
        )
    }

    fun close() {
        handLandmarker?.close()
        handLandmarker = null
    }
}
