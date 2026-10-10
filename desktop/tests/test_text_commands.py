"""
Unit tests for TextCommand generation and Unicode compatibility.
"""

import pytest
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from keyboard.text_commands import TextCommand, CommandType


def test_arabic_char_unicode_preservation():
    arabic_chars = ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج", "د", "لا", "إ", "ء"]
    for ch in arabic_chars:
        cmd = TextCommand.char(ch)
        assert cmd.command_type == CommandType.CHAR
        assert cmd.char_value == ch
        # Verify UTF-16 representation works without error
        utf16_bytes = cmd.char_value.encode("utf-16le")
        assert len(utf16_bytes) >= 2


def test_special_commands():
    cmd_bs = TextCommand.backspace()
    assert cmd_bs.command_type == CommandType.BACKSPACE

    cmd_sp = TextCommand.space()
    assert cmd_sp.command_type == CommandType.SPACE
    assert cmd_sp.char_value == " "

    cmd_ent = TextCommand.enter()
    assert cmd_ent.command_type == CommandType.ENTER
    assert cmd_ent.char_value == "\n"
