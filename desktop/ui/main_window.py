"""
AirType AI - Desktop Main Window (PySide6)
Features asynchronous background tracking thread, virtual keyboard display,
real-time key hover/hit animations, live text log, and Windows system input adapter control.
"""

from typing import Optional
from PySide6.QtCore import Qt, QThread, Signal, Slot, QRectF
from PySide6.QtGui import QColor, QFont, QKeySequence, QPainter, QPen, QShortcut
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QPushButton,
    QLabel, QTextEdit, QFrame, QSplitter, QMessageBox, QStatusBar
)
import numpy as np

try:
    from .camera_widget import CameraWidget
    from .settings_dialog import SettingsDialog
    from ..camera.camera_manager import CameraManager
    from ..hand_tracking.hand_detector import HandDetector
    from ..gestures.gesture_engine import GestureEngine, GestureState
    from ..keyboard.layout_engine import LayoutEngine, KeyBox
    from ..system_keyboard.windows_adapter import WindowsKeyboardAdapter
except (ImportError, ValueError):
    from ui.camera_widget import CameraWidget
    from ui.settings_dialog import SettingsDialog
    from camera.camera_manager import CameraManager
    from hand_tracking.hand_detector import HandDetector
    from gestures.gesture_engine import GestureEngine, GestureState
    from keyboard.layout_engine import LayoutEngine, KeyBox
    from system_keyboard.windows_adapter import WindowsKeyboardAdapter


class WorkerThread(QThread):
    """Worker thread running continuous camera frame acquisition and hand detection."""

    frame_processed = Signal(object, object, str, bool, object)  # frame, cursor, state_name, is_pinch, active_key
    error_occurred = Signal(str)

    def __init__(self, camera_mgr: CameraManager, hand_detector: HandDetector,
                 gesture_engine: GestureEngine, layout_engine: LayoutEngine):
        super().__init__()
        self.camera_mgr = camera_mgr
        self.hand_detector = hand_detector
        self.gesture_engine = gesture_engine
        self.layout_engine = layout_engine
        self.running = True

    def run(self):
        while self.running:
            success, frame = self.camera_mgr.read_frame()
            if not success or frame is None:
                self.msleep(15)
                continue

            # Process hand landmarks
            track_result = self.hand_detector.process_frame(frame)
            # Overlay skeleton on frame
            frame_with_skeleton = self.hand_detector.draw_skeleton(frame, track_result)

            # Process gesture state machine
            state, cursor, click_emitted = self.gesture_engine.process(track_result)

            # Calculate hovered key if cursor is valid
            active_key = None
            if cursor is not None:
                # Map normalized camera cursor (0..1) to virtual keyboard
                active_key = self.layout_engine.hit_test(cursor[0], cursor[1])

            is_pinch = (state in (GestureState.PINCH_POTENTIAL, GestureState.TRIGGERED, GestureState.WAIT_RELEASE))

            self.frame_processed.emit(
                frame_with_skeleton,
                cursor,
                state.value,
                is_pinch,
                (active_key, click_emitted)
            )

            self.msleep(10)

    def stop(self):
        self.running = False
        self.wait(1000)


class VirtualKeyboardWidget(QWidget):
    """Custom painted virtual keyboard rendering keys, hover state, and pinch flash."""

    key_manually_clicked = Signal(object)  # KeyBox

    def __init__(self, layout_engine: LayoutEngine, parent=None):
        super().__init__(parent)
        self.layout_engine = layout_engine
        self._hovered_key: Optional[KeyBox] = None
        self._pressed_key: Optional[KeyBox] = None
        self.setMinimumHeight(240)
        self.setMouseTracking(True)

    def set_hovered_key(self, key_box: Optional[KeyBox]):
        if self._hovered_key != key_box:
            self._hovered_key = key_box
            self.update()

    def flash_key(self, key_box: KeyBox):
        self._pressed_key = key_box
        self.update()

    def mousePressEvent(self, event):
        # Allow touch or mouse click as fallback
        w = self.width()
        h = self.height()
        norm_x = event.position().x() / max(1, w)
        norm_y = event.position().y() / max(1, h)
        key = self.layout_engine.hit_test(norm_x, norm_y)
        if key:
            self.key_manually_clicked.emit(key)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        w = self.width()
        h = self.height()
        keys = self.layout_engine.get_keys()

        # Background
        painter.fillRect(0, 0, w, h, QColor(15, 23, 42))

        gap = 4.0
        for k in keys:
            kx = k.x_min * w + gap
            ky = k.y_min * h + gap
            kw = (k.x_max - k.x_min) * w - gap * 2
            kh = (k.y_max - k.y_min) * h - gap * 2

            key_rect = QRectF(kx, ky, kw, kh)

            # Determine colors
            is_hover = (self._hovered_key and self._hovered_key.id == k.id)
            is_press = (self._pressed_key and self._pressed_key.id == k.id)

            if is_press:
                bg_color = QColor(34, 197, 94)  # Bright green on click
                border_color = QColor(240, 253, 244)
                text_color = QColor(15, 23, 42)
            elif is_hover:
                bg_color = QColor(14, 165, 233)  # Bright cyan on hover
                border_color = QColor(224, 242, 254)
                text_color = QColor(255, 255, 255)
            elif k.type == "action":
                bg_color = QColor(30, 41, 59)
                border_color = QColor(51, 65, 85)
                text_color = QColor(226, 232, 240)
            else:
                bg_color = QColor(24, 32, 47)
                border_color = QColor(44, 56, 74)
                text_color = QColor(241, 245, 249)

            # Draw key background
            painter.setPen(QPen(border_color, 1.5 if is_hover else 1.0))
            painter.setBrush(bg_color)
            painter.drawRoundedRect(key_rect, 8.0, 8.0)

            # Draw key label
            painter.setPen(text_color)
            painter.setFont(QFont("Cairo", 12 if len(k.label) <= 2 else 9, QFont.Bold if is_hover else QFont.Medium))
            painter.drawText(key_rect, Qt.AlignCenter, k.label)

        painter.end()


class MainWindow(QMainWindow):
    """Main window of AirType AI Desktop."""

    def __init__(self):
        super().__init__()
        self.setWindowTitle("AirType AI — لوحة الكتابة في الهواء")
        self.resize(1100, 780)
        self.setLayoutDirection(Qt.RightToLeft)

        # Core engines
        self.camera_mgr = CameraManager()
        self.hand_detector = HandDetector()
        self.gesture_engine = GestureEngine()
        self.layout_engine = LayoutEngine()
        self.system_adapter = WindowsKeyboardAdapter()

        self.worker: Optional[WorkerThread] = None

        self._init_ui()
        self._init_shortcuts()
        self._start_camera()

    def _init_ui(self):
        self.setStyleSheet("""
            QMainWindow { background-color: #090d16; color: #f8fafc; }
            QLabel { color: #e2e8f0; font-family: 'Cairo'; }
            QPushButton { font-family: 'Cairo'; font-size: 13px; font-weight: 600; border-radius: 8px; padding: 8px 14px; }
            QTextEdit { background-color: #0f172a; color: #f8fafc; border: 1px solid #334155; border-radius: 8px; font-family: 'Cairo', 'JetBrains Mono'; font-size: 14px; }
            QStatusBar { background-color: #0b1120; color: #94a3b8; font-family: 'Cairo'; }
        """)

        central_widget = QWidget(self)
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(14, 14, 14, 14)
        main_layout.setSpacing(10)

        # Header bar
        header_bar = QHBoxLayout()
        lbl_title = QLabel("AirType AI — لوحة الكتابة في الهواء")
        lbl_title.setStyleSheet("font-size: 18px; font-weight: 800; color: #38bdf8;")
        header_bar.addWidget(lbl_title)

        lbl_slogan = QLabel("اكتب في الهواء، ودع كلماتك تظهر على الشاشة.")
        lbl_slogan.setStyleSheet("color: #94a3b8; font-size: 13px;")
        header_bar.addWidget(lbl_slogan)

        header_bar.addStretch()

        # Arming switch for Windows external injection
        self.btn_arm_system = QPushButton("تفعيل الإدخال في البرامج الخارجية (Windows SendInput)")
        self.btn_arm_system.setCheckable(True)
        self.btn_arm_system.setStyleSheet("""
            QPushButton { background-color: #334155; color: #94a3b8; border: 1px solid #475569; }
            QPushButton:checked { background-color: #059669; color: #ffffff; border: 1px solid #10b981; }
        """)
        self.btn_arm_system.toggled.connect(self._toggle_system_typing)
        header_bar.addWidget(self.btn_arm_system)

        # Language toggle
        self.btn_lang = QPushButton("اللغة: العربية (AR)")
        self.btn_lang.setStyleSheet("background-color: #1e293b; color: #38bdf8; border: 1px solid #0284c7;")
        self.btn_lang.clicked.connect(self._toggle_language)
        header_bar.addWidget(self.btn_lang)

        # Settings button
        btn_settings = QPushButton("الإعدادات ⚙️")
        btn_settings.setStyleSheet("background-color: #1e293b; color: #e2e8f0; border: 1px solid #475569;")
        btn_settings.clicked.connect(self._open_settings)
        header_bar.addWidget(btn_settings)

        # Big Emergency Stop button
        self.btn_emergency = QPushButton("🛑 إيقاف فوري (F12)")
        self.btn_emergency.setStyleSheet("background-color: #dc2626; color: #ffffff; font-size: 14px; font-weight: 800; padding: 8px 18px;")
        self.btn_emergency.clicked.connect(self._trigger_emergency_stop)
        header_bar.addWidget(self.btn_emergency)

        main_layout.addLayout(header_bar)

        # Main Splitter: Camera on top/left, Virtual keyboard on bottom/right
        splitter = QSplitter(Qt.Vertical, self)

        # Top: Camera + text output
        top_widget = QWidget()
        top_layout = QHBoxLayout(top_widget)
        top_layout.setContentsMargins(0, 0, 0, 0)

        # Camera widget
        self.camera_widget = CameraWidget(self)
        top_layout.addWidget(self.camera_widget, stretch=3)

        # Text output preview and controls
        side_panel = QFrame(self)
        side_panel.setStyleSheet("background-color: #111827; border-radius: 8px; padding: 8px;")
        side_layout = QVBoxLayout(side_panel)

        lbl_text_title = QLabel("معاينة النص المكتوب:")
        lbl_text_title.setStyleSheet("font-weight: 700; color: #cbd5e1;")
        side_layout.addWidget(lbl_text_title)

        self.txt_preview = QTextEdit(self)
        self.txt_preview.setPlaceholderText("ستظهر الحروف والكلمات هنا عند تأكيدها في الهواء، وتُحقن في المفكرة أو البرامج النشطة إذا تم تفعيل الإدخال للنظام...")
        side_layout.addWidget(self.txt_preview)

        # Clear text button
        btn_clear = QPushButton("مسح النص")
        btn_clear.setStyleSheet("background-color: #374151; color: #e5e7eb;")
        btn_clear.clicked.connect(self.txt_preview.clear)
        side_layout.addWidget(btn_clear)

        top_layout.addWidget(side_panel, stretch=2)
        splitter.addWidget(top_widget)

        # Bottom: Virtual keyboard
        self.virtual_keyboard = VirtualKeyboardWidget(self.layout_engine, self)
        self.virtual_keyboard.key_manually_clicked.connect(self._handle_key_execution)
        splitter.addWidget(self.virtual_keyboard)

        main_layout.addWidget(splitter, stretch=1)

        # Status Bar
        self.status_bar = QStatusBar(self)
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("AirType AI جاهز للعمل")

    def _init_shortcuts(self):
        # F12 shortcut for immediate emergency stop
        sc_f12 = QShortcut(QKeySequence("F12"), self)
        sc_f12.activated.connect(self._trigger_emergency_stop)

    def _start_camera(self):
        if self.camera_mgr.start():
            self.worker = WorkerThread(
                self.camera_mgr,
                self.hand_detector,
                self.gesture_engine,
                self.layout_engine
            )
            self.worker.frame_processed.connect(self._on_frame_processed)
            self.worker.start()
            self.status_bar.showMessage("الكاميرا نشطة. ضع يدك أمام العدسة.")
        else:
            QMessageBox.warning(self, "خطأ الكاميرا", self.camera_mgr.get_error() or "تعذر تشغيل الكاميرا")

    @Slot(object, object, str, bool, object)
    def _on_frame_processed(self, frame, cursor, state_name, is_pinch, key_info):
        # Update camera viewport
        self.camera_widget.update_frame(frame, cursor, state_name, is_pinch)

        active_key, click_emitted = key_info
        self.virtual_keyboard.set_hovered_key(active_key)

        if click_emitted and active_key:
            self._handle_key_execution(active_key)

    def _handle_key_execution(self, key_box: KeyBox):
        """Dispatches key action to UI preview and Windows SendInput."""
        self.virtual_keyboard.flash_key(key_box)
        cmd = self.layout_engine.execute_key(key_box)

        # Update text preview in application
        if cmd.command_type.value == "CHAR" and cmd.char_value:
            self.txt_preview.insertPlainText(cmd.char_value)
            if self.system_adapter.is_active():
                self.system_adapter.send_char(cmd.char_value)

        elif cmd.command_type.value == "BACKSPACE":
            cursor = self.txt_preview.textCursor()
            cursor.deletePreviousChar()
            if self.system_adapter.is_active():
                self.system_adapter.send_backspace()

        elif cmd.command_type.value == "SPACE":
            self.txt_preview.insertPlainText(" ")
            if self.system_adapter.is_active():
                self.system_adapter.send_space()

        elif cmd.command_type.value == "ENTER":
            self.txt_preview.insertPlainText("\n")
            if self.system_adapter.is_active():
                self.system_adapter.send_enter()

        elif cmd.command_type.value == "SWITCH_LANG":
            self._update_lang_label()
            self.virtual_keyboard.update()

    def _toggle_system_typing(self, enabled: bool):
        self.system_adapter.set_active(enabled)
        self.gesture_engine.set_active(enabled)
        if enabled:
            self.status_bar.showMessage("تم تفعيل إرسال النصوص إلى Windows SendInput. الحروف ستدخل في التطبيق النشط.")
        else:
            self.status_bar.showMessage("تم إيقاف الإرسال الخارجي. الكتابة الآن داخل نافذة البرنامج فقط.")

    def _toggle_language(self):
        new_lang = self.layout_engine.toggle_language()
        self._update_lang_label()
        self.virtual_keyboard.update()

    def _update_lang_label(self):
        lang = self.layout_engine.active_language
        text = "اللغة: العربية (AR)" if lang == "ar" else "Language: English (EN)"
        self.btn_lang.setText(text)

    def _trigger_emergency_stop(self):
        self.gesture_engine.trigger_emergency_stop()
        self.system_adapter.emergency_stop()
        self.btn_arm_system.setChecked(False)
        self.status_bar.showMessage("🛑 تم تنفيذ الإيقاف الفوري! تم فصل محول الكتابة وتعطيل الإدخال.")
        QMessageBox.information(self, "إيقاف فوري", "تم إيقاف الكتابة فورا وإلغاء تفعيل الإرسال الخارجي بأمان.")

    def _open_settings(self):
        cur_settings = {
            "pinch_threshold": self.gesture_engine.pinch_threshold,
            "smoothing_alpha": self.gesture_engine.cursor_filter.alpha,
            "cooldown_ms": self.gesture_engine.cooldown_ms,
            "camera_index": self.camera_mgr.camera_index,
        }
        dlg = SettingsDialog(self, cur_settings)
        if dlg.exec():
            new_s = dlg.get_settings()
            self.gesture_engine.pinch_threshold = new_s["pinch_threshold"]
            self.gesture_engine.cursor_filter.alpha = new_s["smoothing_alpha"]
            self.gesture_engine.cooldown_ms = new_s["cooldown_ms"]
            self.status_bar.showMessage("تم تطبيق الإعدادات الجديدة بنجاح.")

    def closeEvent(self, event):
        """Safely terminates background threads and releases camera."""
        if self.worker:
            self.worker.stop()
        self.camera_mgr.stop()
        self.hand_detector.close()
        self.system_adapter.emergency_stop()
        event.accept()
