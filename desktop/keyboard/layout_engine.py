"""
AirType AI - Keyboard Layout Engine
Calculates normalized geometry for keys, provides instant hit-testing for pointer coordinates,
and manages layout switching between Arabic and English.
"""

from dataclasses import dataclass
import json
import os
from typing import Dict, List, Optional, Tuple
from .text_commands import TextCommand


@dataclass
class KeyBox:
    id: str
    label: str
    value: str
    type: str  # "char" or "action"
    # Normalized coordinates relative to keyboard rect [0.0 - 1.0]
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    width_units: float


class LayoutEngine:
    """Manages active layout, key boundaries, and coordinate hit-testing."""

    def __init__(self, shared_dir: Optional[str] = None):
        self.shared_dir = shared_dir or self._find_shared_dir()
        self.layouts: Dict[str, dict] = {}
        self.active_language = "ar"  # Default: Arabic
        self.caps_lock = False
        self._compiled_keys: List[KeyBox] = []

        self._load_layouts()
        self._recompile_active_layout()

    def _find_shared_dir(self) -> str:
        """Locates shared/keyboard_layouts relative to module."""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        potential = [
            os.path.abspath(os.path.join(current_dir, "../../shared/keyboard_layouts")),
            os.path.abspath(os.path.join(current_dir, "../../../shared/keyboard_layouts")),
            "/shared/keyboard_layouts",
            "./shared/keyboard_layouts"
        ]
        for p in potential:
            if os.path.isdir(p):
                return p
        return ""

    def _load_layouts(self):
        """Loads JSON layout files."""
        arabic_loaded = False
        english_loaded = False

        if self.shared_dir and os.path.isdir(self.shared_dir):
            ar_path = os.path.join(self.shared_dir, "arabic.json")
            en_path = os.path.join(self.shared_dir, "english.json")

            if os.path.exists(ar_path):
                try:
                    with open(ar_path, "r", encoding="utf-8") as f:
                        self.layouts["ar"] = json.load(f)
                        arabic_loaded = True
                except Exception:
                    pass

            if os.path.exists(en_path):
                try:
                    with open(en_path, "r", encoding="utf-8") as f:
                        self.layouts["en"] = json.load(f)
                        english_loaded = True
                except Exception:
                    pass

        # Built-in robust fallback if filesystem lookup fails
        if not arabic_loaded:
            self.layouts["ar"] = self._fallback_arabic_layout()
        if not english_loaded:
            self.layouts["en"] = self._fallback_english_layout()

    def set_language(self, lang: str):
        """Switches active language between 'ar' and 'en'."""
        if lang in self.layouts and lang != self.active_language:
            self.active_language = lang
            self._recompile_active_layout()

    def toggle_language(self) -> str:
        new_lang = "en" if self.active_language == "ar" else "ar"
        self.set_language(new_lang)
        return new_lang

    def toggle_caps(self):
        self.caps_lock = not self.caps_lock
        self._recompile_active_layout()

    def _recompile_active_layout(self):
        """Computes normalized bounding boxes for each key."""
        layout_data = self.layouts.get(self.active_language, {})
        rows = layout_data.get("rows", [])
        num_rows = len(rows)
        if num_rows == 0:
            self._compiled_keys = []
            return

        compiled: List[KeyBox] = []
        row_height = 1.0 / num_rows

        for r_idx, row in enumerate(rows):
            keys = row.get("keys", [])
            total_units = sum(k.get("width", 1.0) for k in keys)
            if total_units <= 0:
                continue

            current_x = 0.0
            y_min = r_idx * row_height
            y_max = (r_idx + 1) * row_height

            for k in keys:
                w_unit = k.get("width", 1.0)
                norm_w = w_unit / total_units
                x_min = current_x
                x_max = current_x + norm_w
                current_x = x_max

                val = k.get("value", "")
                lbl = k.get("label", val)

                # Caps lock transform for latin chars
                if self.caps_lock and k.get("type") == "char" and self.active_language == "en":
                    val = val.upper()
                    lbl = lbl.upper()

                compiled.append(KeyBox(
                    id=k.get("id", f"k_{r_idx}_{len(compiled)}"),
                    label=lbl,
                    value=val,
                    type=k.get("type", "char"),
                    x_min=x_min,
                    y_min=y_min,
                    x_max=x_max,
                    y_max=y_max,
                    width_units=w_unit,
                ))

        self._compiled_keys = compiled

    def hit_test(self, norm_x: float, norm_y: float) -> Optional[KeyBox]:
        """
        Tests if normalized coordinates (0.0 to 1.0 inside keyboard bounding box)
        fall inside any key.
        """
        if norm_x < 0.0 or norm_x > 1.0 or norm_y < 0.0 or norm_y > 1.0:
            return None

        for k in self._compiled_keys:
            if k.x_min <= norm_x <= k.x_max and k.y_min <= norm_y <= k.y_max:
                return k
        return None

    def execute_key(self, key_box: KeyBox) -> TextCommand:
        """Generates the appropriate TextCommand from a hit key."""
        if key_box.value == "SWITCH_LANG":
            self.toggle_language()
            return TextCommand.switch_lang()
        elif key_box.value == "CAPS_LOCK":
            self.toggle_caps()
            return TextCommand.caps_lock()
        elif key_box.value == "BACKSPACE":
            return TextCommand.backspace()
        elif key_box.value == "SPACE":
            return TextCommand.space()
        elif key_box.value == "ENTER":
            return TextCommand.enter()
        else:
            return TextCommand.char(key_box.value, key_box.label)

    def get_keys(self) -> List[KeyBox]:
        return self._compiled_keys

    def _fallback_arabic_layout(self) -> dict:
        return {
            "layout_id": "ar_fallback",
            "language": "ar",
            "direction": "rtl",
            "rows": [
                {
                    "row_id": "r1",
                    "keys": [{"id": f"ar_{c}", "label": c, "value": c, "type": "char", "width": 1.0} for c in "ضصثقفغعهخحجد"] + [{"id": "bk", "label": "⌫", "value": "BACKSPACE", "type": "action", "width": 1.5}]
                },
                {
                    "row_id": "r2",
                    "keys": [{"id": f"ar_{c}", "label": c, "value": c, "type": "char", "width": 1.0} for c in "شسيبلاتنمكطظ"]
                },
                {
                    "row_id": "r3",
                    "keys": [{"id": f"ar_{c}", "label": c, "value": c, "type": "char", "width": 1.0} for c in "ذرزوةىءأإ"] + [{"id": "ent", "label": "↵", "value": "ENTER", "type": "action", "width": 1.5}]
                },
                {
                    "row_id": "r4",
                    "keys": [
                        {"id": "lang", "label": "EN", "value": "SWITCH_LANG", "type": "action", "width": 1.5},
                        {"id": "sp", "label": "مسافة", "value": "SPACE", "type": "action", "width": 5.0},
                        {"id": "dot", "label": ".", "value": ".", "type": "char", "width": 1.0}
                    ]
                }
            ]
        }

    def _fallback_english_layout(self) -> dict:
        return {
            "layout_id": "en_fallback",
            "language": "en",
            "direction": "ltr",
            "rows": [
                {
                    "row_id": "r1",
                    "keys": [{"id": f"en_{c}", "label": c.upper(), "value": c, "type": "char", "width": 1.0} for c in "qwertyuiop"] + [{"id": "bk", "label": "⌫", "value": "BACKSPACE", "type": "action", "width": 1.5}]
                },
                {
                    "row_id": "r2",
                    "keys": [{"id": f"en_{c}", "label": c.upper(), "value": c, "type": "char", "width": 1.0} for c in "asdfghjkl"]
                },
                {
                    "row_id": "r3",
                    "keys": [{"id": "caps", "label": "⇧", "value": "CAPS_LOCK", "type": "action", "width": 1.2}] + [{"id": f"en_{c}", "label": c.upper(), "value": c, "type": "char", "width": 1.0} for c in "zxcvbnm"] + [{"id": "ent", "label": "↵", "value": "ENTER", "type": "action", "width": 1.5}]
                },
                {
                    "row_id": "r4",
                    "keys": [
                        {"id": "lang", "label": "عربي", "value": "SWITCH_LANG", "type": "action", "width": 1.5},
                        {"id": "sp", "label": "Space", "value": "SPACE", "type": "action", "width": 5.0},
                        {"id": "dot", "label": ".", "value": ".", "type": "char", "width": 1.0}
                    ]
                }
            ]
        }
