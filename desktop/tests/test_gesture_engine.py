"""
Unit tests for GestureEngine: debounce state machine, repeat suppression, and safety controls.
"""

import pytest
import time
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from gestures.gesture_engine import GestureEngine, GestureState, EMACursorFilter
from hand_tracking.hand_detector import HandTrackingResult


def make_tracking_result(detected=True, index_tip=(0.5, 0.5), thumb_tip=(0.5, 0.55),
                         pinch_dist=0.04, is_open_palm=False):
    return HandTrackingResult(
        detected=detected,
        landmarks=[],
        index_tip=index_tip if detected else None,
        thumb_tip=thumb_tip if detected else None,
        wrist=(0.5, 0.8) if detected else None,
        pinch_distance=pinch_dist,
        is_open_palm=is_open_palm,
        handedness="Right"
    )


def test_cursor_ema_smoothing():
    ema = EMACursorFilter(alpha=0.5)
    # First point initializes
    x1, y1 = ema.filter(1.0, 1.0)
    assert x1 == 1.0 and y1 == 1.0

    # Second point is smoothed
    x2, y2 = ema.filter(0.0, 0.0)
    assert x2 == 0.5 and y2 == 0.5


def test_no_hand_detection():
    engine = GestureEngine()
    engine.set_active(True)
    res = make_tracking_result(detected=False)
    state, cursor, click = engine.process(res)
    assert state == GestureState.NO_HAND
    assert cursor is None
    assert click is False


def test_open_palm_pauses_typing():
    engine = GestureEngine()
    engine.set_active(True)
    res = make_tracking_result(detected=True, is_open_palm=True, pinch_dist=0.02)
    state, cursor, click = engine.process(res)
    assert state == GestureState.PALM_PAUSED
    assert click is False


def test_emergency_stop_halts_everything():
    engine = GestureEngine()
    engine.set_active(True)
    engine.trigger_emergency_stop()
    assert engine.is_emergency_stopped() is True

    res = make_tracking_result(detected=True, pinch_dist=0.02)
    state, cursor, click = engine.process(res)
    assert state == GestureState.EMERGENCY_STOPPED
    assert click is False


def test_pinch_click_emitted_exactly_once_and_suppresses_repeat():
    engine = GestureEngine(
        pinch_threshold=0.05,
        release_threshold=0.08,
        min_hold_ms=50,
        cooldown_ms=200
    )
    engine.set_active(True)

    # Frame 1: Finger approaching thumb (distance 0.04 < threshold)
    res_pinch = make_tracking_result(detected=True, pinch_dist=0.04)
    state1, _, click1 = engine.process(res_pinch)
    assert state1 == GestureState.PINCH_POTENTIAL
    assert click1 is False

    # Simulate hold duration passed
    time.sleep(0.06)

    # Frame 2: Hold duration satisfied -> CLICK TRIGGERED!
    state2, _, click2 = engine.process(res_pinch)
    assert click2 is True
    # Immediately in WAIT_RELEASE
    assert state2 == GestureState.WAIT_RELEASE

    # Frame 3, 4, 5: User KEEPS pinch held! MUST NOT emit duplicate clicks!
    for _ in range(5):
        state_hold, _, click_hold = engine.process(res_pinch)
        assert state_hold == GestureState.WAIT_RELEASE
        assert click_hold is False, "Repeat click must be suppressed while pinch is held!"

    # Frame 6: User releases pinch (distance 0.09 >= release_threshold)
    res_released = make_tracking_result(detected=True, pinch_dist=0.09)
    state_rel, _, click_rel = engine.process(res_released)
    assert state_rel == GestureState.IDLE
    assert click_rel is False
