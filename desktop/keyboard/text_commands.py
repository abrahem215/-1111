"""
AirType AI - Text Commands Specification
Encapsulates discrete typing actions produced by keyboard layout hits.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class CommandType(Enum):
    CHAR = "CHAR"
    BACKSPACE = "BACKSPACE"
    SPACE = "SPACE"
    ENTER = "ENTER"
    SWITCH_LANG = "SWITCH_LANG"
    CAPS_LOCK = "CAPS_LOCK"
    NONE = "NONE"


@dataclass
class TextCommand:
    command_type: CommandType
    char_value: Optional[str] = None
    label: str = ""

    @classmethod
    def char(cls, char_val: str, label: str = "") -> "TextCommand":
        return cls(CommandType.CHAR, char_value=char_val, label=label or char_val)

    @classmethod
    def backspace(cls) -> "TextCommand":
        return cls(CommandType.BACKSPACE, label="حذف")

    @classmethod
    def space(cls) -> "TextCommand":
        return cls(CommandType.SPACE, char_value=" ", label="مسافة")

    @classmethod
    def enter(cls) -> "TextCommand":
        return cls(CommandType.ENTER, char_value="\n", label="سطر جديد")

    @classmethod
    def switch_lang(cls) -> "TextCommand":
        return cls(CommandType.SWITCH_LANG, label="تغيير اللغة")

    @classmethod
    def caps_lock(cls) -> "TextCommand":
        return cls(CommandType.CAPS_LOCK, label="حروف كبيرة")

    @classmethod
    def from_key_def(cls, key_def: dict) -> "TextCommand":
        k_val = key_def.get("value", "")
        k_label = key_def.get("label", k_val)
        k_type = key_def.get("type", "char")

        if k_type == "action":
            if k_val == "BACKSPACE":
                return cls.backspace()
            elif k_val == "SPACE":
                return cls.space()
            elif k_val == "ENTER":
                return cls.enter()
            elif k_val == "SWITCH_LANG":
                return cls.switch_lang()
            elif k_val == "CAPS_LOCK":
                return cls.caps_lock()

        return cls.char(k_val, k_label)
