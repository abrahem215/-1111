"""
Unit tests for LayoutEngine: hit testing, layout switching, and boundary checks.
"""

import pytest
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from keyboard.layout_engine import LayoutEngine
from keyboard.text_commands import CommandType


@pytest.fixture
def layout_engine():
    return LayoutEngine()


def test_default_layout_is_arabic(layout_engine):
    assert layout_engine.active_language == "ar"
    keys = layout_engine.get_keys()
    assert len(keys) > 20
    # Check that Arabic keys exist
    labels = [k.label for k in keys]
    assert "ض" in labels or "ب" in labels or "ا" in labels


def test_toggle_language_to_english(layout_engine):
    new_lang = layout_engine.toggle_language()
    assert new_lang == "en"
    assert layout_engine.active_language == "en"

    keys = layout_engine.get_keys()
    labels = [k.label.upper() for k in keys]
    assert "Q" in labels or "A" in labels


def test_hit_test_out_of_bounds(layout_engine):
    assert layout_engine.hit_test(-0.1, 0.5) is None
    assert layout_engine.hit_test(1.2, 0.5) is None
    assert layout_engine.hit_test(0.5, -0.2) is None
    assert layout_engine.hit_test(0.5, 1.5) is None


def test_hit_test_valid_key(layout_engine):
    keys = layout_engine.get_keys()
    first_key = keys[0]
    # Point at the center of the first key
    mid_x = (first_key.x_min + first_key.x_max) / 2.0
    mid_y = (first_key.y_min + first_key.y_max) / 2.0

    hit = layout_engine.hit_test(mid_x, mid_y)
    assert hit is not None
    assert hit.id == first_key.id


def test_execute_key_produces_command(layout_engine):
    keys = layout_engine.get_keys()
    # Find space key
    space_key = next((k for k in keys if k.value == "SPACE"), None)
    assert space_key is not None
    cmd = layout_engine.execute_key(space_key)
    assert cmd.command_type == CommandType.SPACE
    assert cmd.char_value == " "
