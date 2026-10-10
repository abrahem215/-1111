"""
AirType AI - PySide6 Camera Viewport Widget
Paints live camera frames, hand skeleton landmarks, and smoothed laser cursor.
"""

from typing import Optional, Tuple
from PySide6.QtCore import Qt, QPointF
from PySide6.QtGui import QColor, QFont, QImage, QPainter, QPen, QRadialGradient
from PySide6.QtWidgets import QWidget
import numpy as np


class CameraWidget(QWidget):
    """Visualizes webcam feed, hand skeleton, and laser pointer."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMinimumSize(480, 270)
        self._current_frame: Optional[np.ndarray] = None
        self._cursor_norm: Optional[Tuple[float, float]] = None
        self._is_pinching = False
        self._status_text = "في انتظار الكاميرا..."
        self._state_color = QColor(148, 163, 184)
        self.setAttribute(Qt.WA_OpaquePaintEvent, True)

    def update_frame(self, frame_bgr: np.ndarray, cursor_norm: Optional[Tuple[float, float]], state_name: str, is_pinching: bool):
        self._current_frame = frame_bgr
        self._cursor_norm = cursor_norm
        self._is_pinching = is_pinching

        if state_name == "PINCH_POTENTIAL" or state_name == "TRIGGERED":
            self._status_text = "تم ضم الأصابع — تأكيد الحرف"
            self._state_color = QColor(34, 197, 94)  # Green
        elif state_name == "WAIT_RELEASE":
            self._status_text = "في انتظار تحرير الأصابع لمنع التكرار"
            self._state_color = QColor(234, 179, 8)  # Amber
        elif state_name == "PALM_PAUSED":
            self._status_text = "كف مفتوح — الكتابة متوقفة مؤقتاً"
            self._state_color = QColor(59, 130, 246)  # Blue
        elif state_name == "EMERGENCY_STOPPED":
            self._status_text = "توقف فوري للطوارئ!"
            self._state_color = QColor(239, 68, 68)  # Red
        elif state_name == "IDLE":
            self._status_text = "اليد جاهزة — حرك السبابة للتحديد"
            self._state_color = QColor(6, 182, 212)  # Cyan
        else:
            self._status_text = "ضع يدك أمام الكاميرا"
            self._state_color = QColor(148, 163, 184)

        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        w = self.width()
        h = self.height()

        if self._current_frame is not None:
            # Convert BGR to RGB QImage
            rgb = self._current_frame
            h_f, w_f, ch = rgb.shape
            bytes_per_line = ch * w_f
            qimg = QImage(rgb.data, w_f, h_f, bytes_per_line, QImage.Format_BGR888)
            # Scale maintaining aspect ratio
            scaled_img = qimg.scaled(w, h, Qt.KeepAspectRatioByExpanding, Qt.SmoothTransformation)
            # Center crop
            dx = (w - scaled_img.width()) // 2
            dy = (h - scaled_img.height()) // 2
            painter.drawImage(dx, dy, scaled_img)
        else:
            # Dark placeholder
            painter.fillRect(0, 0, w, h, QColor(15, 23, 42))
            painter.setPen(QColor(100, 116, 139))
            painter.setFont(QFont("Cairo", 14))
            painter.drawText(self.rect(), Qt.AlignCenter, "الكاميرا متوقفة")

        # Overlay status pill at top
        painter.setPen(Qt.NoPen)
        painter.setBrush(QColor(15, 23, 42, 200))
        pill_rect = painter.drawRoundedRect(16, 16, 280, 36, 18, 18)

        painter.setBrush(self._state_color)
        painter.drawEllipse(30, 28, 12, 12)

        painter.setPen(QColor(248, 250, 252))
        painter.setFont(QFont("Cairo", 10, QFont.Bold))
        painter.drawText(50, 40, self._status_text)

        # Draw laser cursor if present
        if self._cursor_norm is not None:
            cx = int(self._cursor_norm[0] * w)
            cy = int(self._cursor_norm[1] * h)

            # Outer ring
            ring_color = QColor(34, 197, 94, 220) if self._is_pinching else QColor(6, 182, 212, 220)
            painter.setPen(QPen(ring_color, 3))
            painter.setBrush(Qt.NoBrush)
            radius = 24 if self._is_pinching else 18
            painter.drawEllipse(QPointF(cx, cy), radius, radius)

            # Center dot
            painter.setPen(Qt.NoPen)
            dot_color = QColor(255, 255, 255)
            painter.setBrush(dot_color)
            painter.drawEllipse(QPointF(cx, cy), 5, 5)

            # Crosshairs
            painter.setPen(QPen(ring_color, 1, Qt.DashLine))
            painter.drawLine(cx - 30, cy, cx + 30, cy)
            painter.drawLine(cx, cy - 30, cx, cy + 30)

        painter.end()
