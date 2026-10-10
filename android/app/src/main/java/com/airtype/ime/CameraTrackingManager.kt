package com.airtype.ime

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class CameraTrackingManager(
    private val context: Context,
    private val onFrameBitmap: (Bitmap) -> Unit
) {
    private var cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private var imageAnalysis: ImageAnalysis? = null
    private var camera: Camera? = null

    fun startCamera(lifecycleOwner: LifecycleOwner) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()

            imageAnalysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                .build()
                .also { analysis ->
                    analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                        processImageProxy(imageProxy)
                    }
                }

            val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

            try {
                cameraProvider.unbindAll()
                camera = cameraProvider.bindToLifecycle(
                    lifecycleOwner,
                    cameraSelector,
                    imageAnalysis
                )
            } catch (exc: Exception) {
                // Log or handle camera access constraint
            }
        }, ContextCompat.getMainExecutor(context))
    }

    private fun processImageProxy(imageProxy: ImageProxy) {
        val bitmapBuffer = Bitmap.createBitmap(
            imageProxy.width,
            imageProxy.height,
            Bitmap.Config.ARGB_8888
        )
        imageProxy.use {
            val plane = imageProxy.planes[0]
            bitmapBuffer.copyPixelsFromBuffer(plane.buffer)
        }

        // Apply rotation to match display
        val matrix = Matrix().apply {
            postRotate(imageProxy.imageInfo.rotationDegrees.toFloat())
        }
        val rotatedBitmap = Bitmap.createBitmap(
            bitmapBuffer,
            0, 0,
            bitmapBuffer.width,
            bitmapBuffer.height,
            matrix,
            true
        )

        onFrameBitmap(rotatedBitmap)
    }

    fun stopCamera() {
        imageAnalysis?.clearAnalyzer()
        imageAnalysis = null
        camera = null
    }

    fun release() {
        stopCamera()
        cameraExecutor.shutdown()
    }
}
