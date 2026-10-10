"""
AirType AI - Camera Manager
Manages webcam acquisition in a dedicated worker thread with frame mirroring,
stable FPS pacing, and thread-safe shutdown.
"""

import cv2
import threading
import time
from typing import Optional, Tuple
import numpy as np


class CameraManager:
    """Threaded camera capture engine for AirType AI."""

    def __init__(self, camera_index: int = 0, width: int = 1280, height: int = 720, target_fps: int = 30):
        self.camera_index = camera_index
        self.width = width
        self.height = height
        self.target_fps = target_fps
        self._cap: Optional[cv2.VideoCapture] = None
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._lock = threading.Lock()
        self._current_frame: Optional[np.ndarray] = None
        self._fps_actual = 0.0
        self._frame_count = 0
        self._last_fps_calc = time.time()
        self._error_message: Optional[str] = None

    def start(self) -> bool:
        """Starts the camera background acquisition thread."""
        if self._running:
            return True

        self._cap = cv2.VideoCapture(self.camera_index)
        if not self._cap or not self._cap.isOpened():
            self._error_message = f"تعذر فتح الكاميرا بالرقم {self.camera_index}"
            return False

        # Set hardware properties
        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        self._cap.set(cv2.CAP_PROP_FPS, self.target_fps)

        self._running = True
        self._error_message = None
        self._thread = threading.Thread(target=self._capture_loop, daemon=True, name="AirTypeCamThread")
        self._thread.start()
        return True

    def _capture_loop(self):
        """Internal capture loop running at target FPS."""
        frame_interval = 1.0 / max(10, self.target_fps)
        while self._running:
            start_time = time.time()
            if self._cap and self._cap.isOpened():
                ret, frame = self._cap.read()
                if ret and frame is not None:
                    # Mirror horizontally so moving hand right moves cursor right
                    mirrored = cv2.flip(frame, 1)
                    with self._lock:
                        self._current_frame = mirrored
                        self._frame_count += 1
                        elapsed = time.time() - self._last_fps_calc
                        if elapsed >= 1.0:
                            self._fps_actual = self._frame_count / elapsed
                            self._frame_count = 0
                            self._last_fps_calc = time.time()
                else:
                    with self._lock:
                        self._error_message = "فشل التقاط الإطار من الكاميرا"
                    time.sleep(0.1)

            # Frame pacing
            compute_time = time.time() - start_time
            sleep_time = max(0.001, frame_interval - compute_time)
            time.sleep(sleep_time)

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Thread-safe copy of the latest captured frame."""
        with self._lock:
            if self._current_frame is not None:
                return True, self._current_frame.copy()
            return False, None

    def get_fps(self) -> float:
        """Returns the actual smoothed FPS."""
        with self._lock:
            return self._fps_actual

    def get_error(self) -> Optional[str]:
        """Returns the last known error message if any."""
        with self._lock:
            return self._error_message

    def is_running(self) -> bool:
        return self._running

    def stop(self):
        """Stops capturing and releases hardware camera handle."""
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
        self._thread = None

        if self._cap:
            try:
                self._cap.release()
            except Exception:
                pass
            self._cap = None

        with self._lock:
            self._current_frame = None
