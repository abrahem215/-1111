"""
AirType AI - Gesture Recognition Engine
Implements anti-jitter cursor smoothing, strict pinch debounce state machine,
open-palm pause detection, and repeat-suppression logic.
"""

from enum import Enum
import time
from typing import Optional, Tuple

try:
    from ..hand_tracking.hand_detector import HandTrackingResult
except (ImportError, ValueError):
    from hand_tracking.hand_detector import HandTrackingResult


class GestureState(Enum):
    NO_HAND = "NO_HAND"
    IDLE = "IDLE"                    # Hand present, fingers open
    PINCH_POTENTIAL = "PINCH_POTENTIAL" # Distance < threshold, awaiting hold duration
    TRIGGERED = "TRIGGERED"          # Click event emitted once
    WAIT_RELEASE = "WAIT_RELEASE"    # Still pinching; suppressing repeated clicks
    PALM_PAUSED = "PALM_PAUSED"      # Open palm paused
    EMERGENCY_STOPPED = "EMERGENCY_STOPPED"


class EMACursorFilter:
    """Exponential Moving Average filter for cursor stabilization."""

    def __init__(self, alpha: float = 0.35):
        self.alpha = alpha
        self._filtered_x: Optional[float] = None
        self._filtered_y: Optional[float] = None

    def filter(self, x: float, y: float) -> Tuple[float, float]:
        if self._filtered_x is None or self._filtered_y is None:
            self._filtered_x = x
            self._filtered_y = y
        else:
            self._filtered_x = self.alpha * x + (1.0 - self.alpha) * self._filtered_x
            self._filtered_y = self.alpha * y + (1.0 - self.alpha) * self._filtered_y
        return self._filtered_x, self._filtered_y

    def reset(self):
        self._filtered_x = None
        self._filtered_y = None


class GestureEngine:
    """Core gesture engine enforcing safety, debounce, and duplicate prevention."""

    def __init__(
        self,
        pinch_threshold: float = 0.055,
        release_threshold: float = 0.085,
        min_hold_ms: int = 100,
        cooldown_ms: int = 300,
        smoothing_alpha: float = 0.35,
    ):
        self.pinch_threshold = pinch_threshold
        self.release_threshold = release_threshold
        self.min_hold_ms = min_hold_ms
        self.cooldown_ms = cooldown_ms

        self.state = GestureState.NO_HAND
        self.cursor_filter = EMACursorFilter(alpha=smoothing_alpha)

        self._pinch_start_time: Optional[float] = None
        self._last_trigger_time: float = 0.0
        self._emergency_stop = False
        self._is_active = False  # Explicit arming required

    def set_active(self, active: bool):
        """Arm or disarm air typing."""
        self._is_active = active
        if not active:
            self.state = GestureState.IDLE
            self._pinch_start_time = None

    def is_active(self) -> bool:
        return self._is_active

    def trigger_emergency_stop(self):
        """Halts all typing instantly."""
        self._emergency_stop = True
        self.state = GestureState.EMERGENCY_STOPPED
        self._is_active = False

    def reset_emergency_stop(self):
        """Resets emergency stop status."""
        self._emergency_stop = False
        self.state = GestureState.IDLE

    def is_emergency_stopped(self) -> bool:
        return self._emergency_stop

    def process(self, tracking_result: HandTrackingResult) -> Tuple[GestureState, Optional[Tuple[float, float]], bool]:
        """
        Processes hand metrics.
        Returns:
            - state: current GestureState
            - smoothed_cursor: (x, y) normalized coordinates or None
            - click_emitted: True ONLY on the single frame when pinch is confirmed!
        """
        click_emitted = False

        if self._emergency_stop:
            return GestureState.EMERGENCY_STOPPED, None, False

        if not tracking_result.detected or tracking_result.index_tip is None:
            self.state = GestureState.NO_HAND
            self._pinch_start_time = None
            self.cursor_filter.reset()
            return GestureState.NO_HAND, None, False

        # Apply smoothing to index tip
        raw_x, raw_y = tracking_result.index_tip
        smooth_x, smooth_y = self.cursor_filter.filter(raw_x, raw_y)
        cursor = (smooth_x, smooth_y)

        # Check open palm pause
        if tracking_result.is_open_palm:
            self.state = GestureState.PALM_PAUSED
            self._pinch_start_time = None
            return GestureState.PALM_PAUSED, cursor, False

        # If not armed, track cursor without triggering clicks
        if not self._is_active:
            self.state = GestureState.IDLE
            return GestureState.IDLE, cursor, False

        current_time = time.time() * 1000.0  # ms
        dist = tracking_result.pinch_distance

        # State transitions
        if self.state in (GestureState.IDLE, GestureState.NO_HAND, GestureState.PALM_PAUSED):
            if dist <= self.pinch_threshold:
                # Check cooldown from last click
                if current_time - self._last_trigger_time >= self.cooldown_ms:
                    self.state = GestureState.PINCH_POTENTIAL
                    self._pinch_start_time = current_time
            else:
                self.state = GestureState.IDLE

        elif self.state == GestureState.PINCH_POTENTIAL:
            if dist > self.pinch_threshold:
                # Aborted pinch before hold time
                self.state = GestureState.IDLE
                self._pinch_start_time = None
            else:
                elapsed = current_time - (self._pinch_start_time or current_time)
                if elapsed >= self.min_hold_ms:
                    # Pinch confirmed! Fire click event EXACTLY ONCE
                    self.state = GestureState.TRIGGERED
                    self._last_trigger_time = current_time
                    click_emitted = True
                    # Immediately transition to WAIT_RELEASE to prevent repetition
                    self.state = GestureState.WAIT_RELEASE

        elif self.state == GestureState.WAIT_RELEASE:
            # Must separate fingers beyond release_threshold before next click can ever fire!
            if dist >= self.release_threshold:
                self.state = GestureState.IDLE
                self._pinch_start_time = None

        return self.state, cursor, click_emitted
