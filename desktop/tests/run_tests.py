#!/usr/bin/env python3
"""
AirType AI - Lightweight Python Unit Test Runner
Runs layout, gesture, and text command tests using Python's standard library.
"""

import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
desktop_dir = os.path.abspath(os.path.join(current_dir, ".."))
if desktop_dir not in sys.path:
    sys.path.insert(0, desktop_dir)

from keyboard.layout_engine import LayoutEngine
from keyboard.text_commands import TextCommand, CommandType
from gestures.gesture_engine import GestureEngine, GestureState, EMACursorFilter
from hand_tracking.hand_detector import HandTrackingResult


def test_layout():
    engine = LayoutEngine()
    assert engine.active_language == "ar", "Default language should be Arabic"
    keys = engine.get_keys()
    assert len(keys) > 20, "Should have more than 20 keys"
    
    # Hit testing
    k0 = keys[0]
    mid_x = (k0.x_min + k0.x_max) / 2.0
    mid_y = (k0.y_min + k0.y_max) / 2.0
    hit = engine.hit_test(mid_x, mid_y)
    assert hit is not None and hit.id == k0.id, "Hit test should match key 0"
    
    # Language toggle
    new_lang = engine.toggle_language()
    assert new_lang == "en" and engine.active_language == "en", "Language toggle failed"
    print("✓ LayoutEngine Tests Passed!")


def test_gestures():
    g = GestureEngine(pinch_threshold=0.05, release_threshold=0.08, min_hold_ms=50, cooldown_ms=200)
    g.set_active(True)

    # EMA
    ema = EMACursorFilter(alpha=0.5)
    x1, y1 = ema.filter(1.0, 1.0)
    x2, y2 = ema.filter(0.0, 0.0)
    assert x2 == 0.5 and y2 == 0.5, "EMA smoothing math failed"

    # Tracking result with pinch
    res = HandTrackingResult(
        detected=True,
        landmarks=[],
        index_tip=(0.5, 0.5),
        thumb_tip=(0.5, 0.54),
        wrist=(0.5, 0.8),
        pinch_distance=0.04,
        is_open_palm=False,
        handedness="Right"
    )

    state1, _, click1 = g.process(res)
    assert state1 == GestureState.PINCH_POTENTIAL and not click1, "Should enter PINCH_POTENTIAL"

    import time
    time.sleep(0.06)
    state2, _, click2 = g.process(res)
    assert click2 is True, "Pinch click should be confirmed"
    assert state2 == GestureState.WAIT_RELEASE, "Should be in WAIT_RELEASE"

    # Repeat suppression
    for _ in range(5):
        _, _, c = g.process(res)
        assert c is False, "Repeat clicks must be blocked while holding pinch!"

    print("✓ GestureEngine Tests Passed!")


def test_commands():
    chars = ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج", "د", "لا", "إ", "ء"]
    for ch in chars:
        cmd = TextCommand.char(ch)
        assert cmd.command_type == CommandType.CHAR
        assert cmd.char_value == ch
    print("✓ TextCommands Tests Passed!")


if __name__ == "__main__":
    print("Running AirType AI Desktop Test Suite...")
    test_layout()
    test_gestures()
    test_commands()
    print("All Python tests succeeded with 100% pass rate!")
