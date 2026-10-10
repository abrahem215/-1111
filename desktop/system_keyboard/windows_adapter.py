"""
AirType AI - Windows System Keyboard Adapter
Implements low-level Windows SendInput API with Unicode support for full Arabic and English
text injection into external applications (Notepad, Word, Chrome, etc.) without stealing focus.
"""

import sys
import time
from typing import List, Optional
from .adapter import SystemKeyboardAdapter

# Windows ctypes definitions
IS_WINDOWS = sys.platform == "win32"

if IS_WINDOWS:
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.windll.user32

    # Win32 Constants
    INPUT_KEYBOARD = 1
    KEYEVENTF_EXTENDEDKEY = 0x0001
    KEYEVENTF_KEYUP = 0x0002
    KEYEVENTF_UNICODE = 0x0004
    KEYEVENTF_SCANCODE = 0x0008

    VK_BACK = 0x08
    VK_SPACE = 0x20
    VK_RETURN = 0x0D

    ULONG_PTR = ctypes.c_ulonglong if ctypes.sizeof(ctypes.c_void_p) == 8 else ctypes.c_ulong

    class KEYBDINPUT(ctypes.Structure):
        _fields_ = [
            ("wVk", wintypes.WORD),
            ("wScan", wintypes.WORD),
            ("dwFlags", wintypes.DWORD),
            ("time", wintypes.DWORD),
            ("dwExtraInfo", ULONG_PTR),
        ]

    class HARDWAREINPUT(ctypes.Structure):
        _fields_ = [
            ("uMsg", wintypes.DWORD),
            ("wParamL", wintypes.WORD),
            ("wParamH", wintypes.WORD),
        ]

    class MOUSEINPUT(ctypes.Structure):
        _fields_ = [
            ("dx", wintypes.LONG),
            ("dy", wintypes.LONG),
            ("mouseData", wintypes.DWORD),
            ("dwFlags", wintypes.DWORD),
            ("time", wintypes.DWORD),
            ("dwExtraInfo", ULONG_PTR),
        ]

    class INPUT_UNION(ctypes.Union):
        _fields_ = [
            ("ki", KEYBDINPUT),
            ("mi", MOUSEINPUT),
            ("hi", HARDWAREINPUT),
        ]

    class INPUT(ctypes.Structure):
        _fields_ = [
            ("type", wintypes.DWORD),
            ("union", INPUT_UNION),
        ]


class WindowsKeyboardAdapter(SystemKeyboardAdapter):
    """Production Windows input injector using SendInput with Unicode (KEYEVENTF_UNICODE)."""

    def __init__(self):
        self._active = False
        self._history: List[str] = []
        self._last_error: Optional[str] = None

    def is_active(self) -> bool:
        return self._active

    def set_active(self, active: bool):
        self._active = active

    def emergency_stop(self):
        """Immediately disables input injection."""
        self._active = False
        self._release_all_stuck_keys()

    def _release_all_stuck_keys(self):
        """Releases common modifier keys if stuck."""
        if not IS_WINDOWS:
            return
        try:
            # Send keyups for Shift, Ctrl, Alt
            for vk in (0x10, 0x11, 0x12):
                inp = INPUT()
                inp.type = INPUT_KEYBOARD
                inp.union.ki.wVk = vk
                inp.union.ki.wScan = 0
                inp.union.ki.dwFlags = KEYEVENTF_KEYUP
                user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
        except Exception:
            pass

    def send_char(self, char: str) -> bool:
        """Injects a single Unicode character (Arabic or English) into target window."""
        if not self._active or not char:
            return False

        self._history.append(char)

        if not IS_WINDOWS:
            # Fallback simulator for Linux / Dev preview
            print(f"[AirType Simulation System Output]: '{char}'")
            return True

        try:
            # Encode each UTF-16 code unit for Windows Unicode SendInput
            utf16_units = char.encode("utf-16le")
            # Iterate 2 bytes at a time
            for i in range(0, len(utf16_units), 2):
                code_point = int.from_bytes(utf16_units[i : i + 2], byteorder="little")

                # Key Down
                inp_down = INPUT()
                inp_down.type = INPUT_KEYBOARD
                inp_down.union.ki.wVk = 0
                inp_down.union.ki.wScan = code_point
                inp_down.union.ki.dwFlags = KEYEVENTF_UNICODE
                inp_down.union.ki.time = 0
                inp_down.union.ki.dwExtraInfo = 0

                # Key Up
                inp_up = INPUT()
                inp_up.type = INPUT_KEYBOARD
                inp_up.union.ki.wVk = 0
                inp_up.union.ki.wScan = code_point
                inp_up.union.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP
                inp_up.union.ki.time = 0
                inp_up.union.ki.dwExtraInfo = 0

                inputs = (INPUT * 2)(inp_down, inp_up)
                sent = user32.SendInput(2, ctypes.byref(inputs), ctypes.sizeof(INPUT))
                if sent != 2:
                    self._last_error = f"SendInput failed for code_point {code_point}"
                    return False

            return True
        except Exception as e:
            self._last_error = str(e)
            return False

    def send_backspace(self) -> bool:
        """Sends Backspace key event."""
        if not self._active:
            return False

        if not IS_WINDOWS:
            print("[AirType Simulation System Output]: <BACKSPACE>")
            return True

        return self._send_virtual_key(VK_BACK)

    def send_space(self) -> bool:
        """Sends Space key event."""
        if not self._active:
            return False

        if not IS_WINDOWS:
            print("[AirType Simulation System Output]: <SPACE>")
            return True

        return self.send_char(" ")

    def send_enter(self) -> bool:
        """Sends Enter / Return key event."""
        if not self._active:
            return False

        if not IS_WINDOWS:
            print("[AirType Simulation System Output]: <ENTER>")
            return True

        return self._send_virtual_key(VK_RETURN)

    def _send_virtual_key(self, vk_code: int) -> bool:
        try:
            inp_down = INPUT()
            inp_down.type = INPUT_KEYBOARD
            inp_down.union.ki.wVk = vk_code
            inp_down.union.ki.wScan = 0
            inp_down.union.ki.dwFlags = 0
            inp_down.union.ki.time = 0
            inp_down.union.ki.dwExtraInfo = 0

            inp_up = INPUT()
            inp_up.type = INPUT_KEYBOARD
            inp_up.union.ki.wVk = vk_code
            inp_up.union.ki.wScan = 0
            inp_up.union.ki.dwFlags = KEYEVENTF_KEYUP
            inp_up.union.ki.time = 0
            inp_up.union.ki.dwExtraInfo = 0

            inputs = (INPUT * 2)(inp_down, inp_up)
            sent = user32.SendInput(2, ctypes.byref(inputs), ctypes.sizeof(INPUT))
            return sent == 2
        except Exception as e:
            self._last_error = str(e)
            return False

    def get_history(self) -> List[str]:
        return list(self._history)
