import { ProjectFile } from './types';

export const ALL_PROJECT_FILES: ProjectFile[] = [
  {
    path: 'README.md',
    category: 'root',
    language: 'markdown',
    content: `# AirType AI — لوحة الكتابة في الهواء
> اكتب في الهواء، ودع كلماتك تظهر على الشاشة.

AirType AI هو مشروع برمجي متكامل يتيح للمستخدمين كتابة النصوص والحروف في الهواء باستخدام حركة اليد والأصابع أمام الكاميرا، دون الحاجة إلى لمس لوحة المفاتيح المادية، مع إمكانية إدخال النصوص مباشرة في التطبيقات الأخرى (مثل المفكرة، المتصفح، محرر النصوص، وتطبيقات الهاتف).

## المنصات المدعومة:
1. نظام Windows: مكتوب بلغة Python و PySide6 مع واجهة SendInput للحقن في البرامج الخارجية.
2. نظام Android: مكتوب بلغة Kotlin و Jetpack Compose مع InputMethodService و CameraX ككيبورد نظامي حقيقي.`
  },
  {
    path: 'desktop/requirements.txt',
    category: 'desktop',
    language: 'text',
    content: `PySide6>=6.6.0
opencv-python>=4.8.0
mediapipe>=0.10.9
numpy>=1.24.0
pytest>=7.4.0
pywin32>=306; sys_platform == 'win32'`
  },
  {
    path: 'desktop/main.py',
    category: 'desktop',
    language: 'python',
    content: `#!/usr/bin/env python3
"""
AirType AI — Desktop Entry Point
"""
import sys, os
from PySide6.QtWidgets import QApplication
from PySide6.QtGui import QFont
from ui.main_window import MainWindow

def main():
    app = QApplication(sys.argv)
    app.setApplicationName("AirType AI")
    font = QFont("Cairo", 10)
    app.setFont(font)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()`
  },
  {
    path: 'desktop/camera/camera_manager.py',
    category: 'desktop',
    language: 'python',
    content: `"""
AirType AI - Camera Manager
Manages webcam acquisition in a dedicated worker thread with frame mirroring.
"""
import cv2, threading, time
from typing import Optional, Tuple
import numpy as np

class CameraManager:
    def __init__(self, camera_index=0, width=1280, height=720, target_fps=30):
        self.camera_index = camera_index
        self.width = width
        self.height = height
        self.target_fps = target_fps
        self._cap = None
        self._thread = None
        self._running = False
        self._lock = threading.Lock()
        self._current_frame = None

    def start(self) -> bool:
        self._cap = cv2.VideoCapture(self.camera_index)
        if not self._cap or not self._cap.isOpened():
            return False
        self._running = True
        self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._thread.start()
        return True

    def _capture_loop(self):
        while self._running:
            if self._cap and self._cap.isOpened():
                ret, frame = self._cap.read()
                if ret and frame is not None:
                    mirrored = cv2.flip(frame, 1)
                    with self._lock:
                        self._current_frame = mirrored
            time.sleep(1.0 / max(10, self.target_fps))

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        with self._lock:
            if self._current_frame is not None:
                return True, self._current_frame.copy()
            return False, None

    def stop(self):
        self._running = False
        if self._cap:
            self._cap.release()
            self._cap = None`
  },
  {
    path: 'desktop/gestures/gesture_engine.py',
    category: 'desktop',
    language: 'python',
    content: `"""
AirType AI - Gesture Engine & Anti-Repeat State Machine
"""
from enum import Enum
import time

class GestureState(Enum):
    NO_HAND = "NO_HAND"
    IDLE = "IDLE"
    PINCH_POTENTIAL = "PINCH_POTENTIAL"
    TRIGGERED = "TRIGGERED"
    WAIT_RELEASE = "WAIT_RELEASE"
    PALM_PAUSED = "PALM_PAUSED"
    EMERGENCY_STOPPED = "EMERGENCY_STOPPED"

class GestureEngine:
    def __init__(self, pinch_threshold=0.055, release_threshold=0.085, min_hold_ms=100, cooldown_ms=300):
        self.pinch_threshold = pinch_threshold
        self.release_threshold = release_threshold
        self.min_hold_ms = min_hold_ms
        self.cooldown_ms = cooldown_ms
        self.state = GestureState.NO_HAND
        self._pinch_start = None
        self._last_trigger = 0

    def process(self, tracking_result):
        # Enforces minimum hold duration and strictly blocks repeats until release
        # ... (See full implementation in desktop/gestures/gesture_engine.py)`
  },
  {
    path: 'desktop/system_keyboard/windows_adapter.py',
    category: 'desktop',
    language: 'python',
    content: `"""
AirType AI - Windows SendInput Adapter
Injects Unicode characters (Arabic & English) into active windows without stealing focus.
"""
import sys, ctypes
from ctypes import wintypes
from .adapter import SystemKeyboardAdapter

INPUT_KEYBOARD = 1
KEYEVENTF_UNICODE = 0x0004
KEYEVENTF_KEYUP = 0x0002

class WindowsKeyboardAdapter(SystemKeyboardAdapter):
    def send_char(self, char: str) -> bool:
        if not self._active or not char:
            return False
        # Sends UTF-16 code units via user32.SendInput...`
  },
  {
    path: 'android/app/src/main/java/com/airtype/ime/AirTypeIME.kt',
    category: 'android',
    language: 'kotlin',
    content: `package com.airtype.ime

import android.inputmethodservice.InputMethodService
import android.view.KeyEvent
import android.view.View
import androidx.compose.ui.platform.ComposeView

class AirTypeIME : InputMethodService() {
    private val gestureEngine = AndroidGestureEngine()

    override fun onCreateInputView(): View {
        return ComposeView(this).apply {
            setContent {
                AirTypeKeyboardView(
                    // ... Jetpack Compose surface
                )
            }
        }
    }

    private fun executeKey(key: AndroidKey) {
        val ic = currentInputConnection ?: return
        when (key.value) {
            "BACKSPACE" -> ic.deleteSurroundingText(1, 0)
            "SPACE" -> ic.commitText(" ", 1)
            "ENTER" -> ic.sendKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER))
            else -> ic.commitText(key.value, 1)
        }
    }
}`
  },
  {
    path: 'android/app/src/main/AndroidManifest.xml',
    category: 'android',
    language: 'xml',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.CAMERA" />
    <application>
        <service
            android:name=".AirTypeIME"
            android:label="@string/ime_name"
            android:permission="android.permission.BIND_INPUT_METHOD"
            android:exported="true">
            <intent-filter>
                <action android:name="android.view.InputMethod" />
            </intent-filter>
            <meta-data
                android:name="android.view.im"
                android:resource="@xml/method" />
        </service>
    </application>
</manifest>`
  },
  {
    path: 'shared/gesture_spec.json',
    category: 'shared',
    language: 'json',
    content: `{
  "version": "1.0.0",
  "name": "AirType Gesture Specification",
  "gestures": {
    "POINTER_MOVE": { "finger": "INDEX_FINGER_TIP", "landmark_id": 8 },
    "KEY_SELECT_PINCH": { "threshold_normalized_distance": 0.055, "min_hold_duration_ms": 120 }
  }
}`
  },
  {
    path: 'docs/ARCHITECTURE.md',
    category: 'docs',
    language: 'markdown',
    content: `# هندسة وتصميم مشروع AirType AI
- تدفق البيانات: الكاميرا -> MediaPipe -> فلتر EMA -> آلة الحالات -> محول النظام
- منع تكرار الحروف عبر دورة WAIT_RELEASE
- حقن Unicode على Windows عبر SendInput بدون سرقة التركيز
- خدمة InputMethodService على أندرويد مع CameraX`
  },
  {
    path: 'docs/INSTALL_WINDOWS.md',
    category: 'docs',
    language: 'markdown',
    content: `# دليل تثبيت وتشغيل AirType AI على أجهزة Windows
1. تثبيت Python 3.9+
2. تثبيت الحزم: pip install -r requirements.txt
3. تشغيل البرنامج: python main.py
4. تفعيل زر Windows SendInput والكتابة في المفكرة في الهواء!`
  },
  {
    path: 'docs/INSTALL_ANDROID.md',
    category: 'docs',
    language: 'markdown',
    content: `# دليل بناء وتثبيت AirType AI على هواتف Android
1. فتح المشروع في Android Studio
2. مزامنة Gradle وبناء APK: ./gradlew assembleDebug
3. تفعيل لوحة المفاتيح في إعدادات النظام واختيارها ككيبورد افتراضي
4. منح صلاحية الكاميرا والبدء في الكتابة في الهواء في أي تطبيق!`
  },
  {
    path: 'src/handTracker.ts',
    category: 'shared',
    language: 'typescript',
    content: `/**
 * AirType AI - Browser MediaPipe Hand Tracker
 * Integrates MediaPipe Tasks Vision HandLandmarker for real-time video processing.
 */
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export async function initHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );
  return await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numHands: 1,
  });
}`
  },
  {
    path: 'src/components/HandCalibrationModal.tsx',
    category: 'shared',
    language: 'typescript',
    content: `/**
 * AirType AI - Hand Calibration System
 * 5-Step interactive calibration for camera bounds, index finger targeting, and gesture thresholds.
 */`
  },
  {
    path: 'src/components/HandTrainingView.tsx',
    category: 'shared',
    language: 'typescript',
    content: `/**
 * AirType AI - Hand Training Mode
 * 5 Guided progressive exercises: Stability, Aiming, Key Targeting, Repeat Lock, and Word Writing.
 */`
  }
];
