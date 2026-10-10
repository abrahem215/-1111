"""
AirType AI - Settings Dialog (PySide6)
Allows tuning gesture sensitivity, smoothing, debouncing cooldowns, and camera source.
"""

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel,
    QSlider, QSpinBox, QPushButton, QGroupBox, QFormLayout
)


class SettingsDialog(QDialog):
    """Dialog for customizing AirType engine parameters."""

    def __init__(self, parent=None, current_settings=None):
        super().__init__(parent)
        self.setWindowTitle("إعدادات AirType AI")
        self.setLayoutDirection(Qt.RightToLeft)
        self.resize(460, 380)

        settings = current_settings or {}
        self.pinch_threshold = settings.get("pinch_threshold", 0.055)
        self.smoothing_alpha = settings.get("smoothing_alpha", 0.35)
        self.cooldown_ms = settings.get("cooldown_ms", 300)
        self.camera_index = settings.get("camera_index", 0)

        self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)

        group = QGroupBox("معايير تتبع اليد وحساسية الإيماءات", self)
        form = QFormLayout(group)

        # Pinch threshold slider
        self.slider_pinch = QSlider(Qt.Horizontal)
        self.slider_pinch.setRange(20, 120)  # 0.020 to 0.120
        self.slider_pinch.setValue(int(self.pinch_threshold * 1000))
        self.lbl_pinch_val = QLabel(f"{self.pinch_threshold:.3f}")
        self.slider_pinch.valueChanged.connect(
            lambda v: self.lbl_pinch_val.setText(f"{v / 1000.0:.3f}")
        )
        h_pinch = QHBoxLayout()
        h_pinch.addWidget(self.slider_pinch)
        h_pinch.addWidget(self.lbl_pinch_val)
        form.addRow("مسافة التقاط الضم (Pinch):", h_pinch)

        # Smoothing alpha slider
        self.slider_smooth = QSlider(Qt.Horizontal)
        self.slider_smooth.setRange(10, 90)  # 0.10 to 0.90
        self.slider_smooth.setValue(int(self.smoothing_alpha * 100))
        self.lbl_smooth_val = QLabel(f"{self.smoothing_alpha:.2f}")
        self.slider_smooth.valueChanged.connect(
            lambda v: self.lbl_smooth_val.setText(f"{v / 100.0:.2f}")
        )
        h_smooth = QHBoxLayout()
        h_smooth.addWidget(self.slider_smooth)
        h_smooth.addWidget(self.lbl_smooth_val)
        form.addRow("معامل تنعيم المؤشر (EMA Alpha):", h_smooth)

        # Cooldown ms spinbox
        self.spin_cooldown = QSpinBox()
        self.spin_cooldown.setRange(100, 1500)
        self.spin_cooldown.setSingleStep(50)
        self.spin_cooldown.setValue(self.cooldown_ms)
        self.spin_cooldown.setSuffix(" مللي ثانية")
        form.addRow("مهلة منع التكرار بين الضغطات:", self.spin_cooldown)

        # Camera index
        self.spin_cam = QSpinBox()
        self.spin_cam.setRange(0, 5)
        self.spin_cam.setValue(self.camera_index)
        form.addRow("رقم جهاز الكاميرا (Camera Index):", self.spin_cam)

        layout.addWidget(group)

        # Buttons
        h_btns = QHBoxLayout()
        btn_save = QPushButton("حفظ التغييرات")
        btn_save.setStyleSheet("background-color: #0284c7; color: white; padding: 8px 16px; border-radius: 6px; font-weight: bold;")
        btn_save.clicked.connect(self.accept)

        btn_cancel = QPushButton("إلغاء")
        btn_cancel.setStyleSheet("background-color: #334155; color: white; padding: 8px 16px; border-radius: 6px;")
        btn_cancel.clicked.connect(self.reject)

        h_btns.addStretch()
        h_btns.addWidget(btn_cancel)
        h_btns.addWidget(btn_save)

        layout.addLayout(h_btns)

    def get_settings(self) -> dict:
        return {
            "pinch_threshold": self.slider_pinch.value() / 1000.0,
            "smoothing_alpha": self.slider_smooth.value() / 100.0,
            "cooldown_ms": self.spin_cooldown.value(),
            "camera_index": self.spin_cam.value(),
        }
