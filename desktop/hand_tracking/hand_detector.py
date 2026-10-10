"""
AirType AI - Hand Tracking Processor
Detects 21 3D hand landmarks via MediaPipe with landmark extraction,
hand presence tracking, and coordinate normalization.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Tuple

try:
    import cv2
except ImportError:
    cv2 = None

try:
    import numpy as np
except ImportError:
    np = None

# Landmark constants from MediaPipe Hand specification
WRIST = 0
THUMB_CMC = 1
THUMB_MCP = 2
THUMB_IP = 3
THUMB_TIP = 4
INDEX_MCP = 5
INDEX_PIP = 6
INDEX_DIP = 7
INDEX_TIP = 8
MIDDLE_MCP = 9
MIDDLE_PIP = 10
MIDDLE_DIP = 11
MIDDLE_TIP = 12
RING_MCP = 13
RING_PIP = 14
RING_DIP = 15
RING_TIP = 16
PINKY_MCP = 17
PINKY_PIP = 18
PINKY_DIP = 19
PINKY_TIP = 20


@dataclass
class HandLandmark:
    x: float  # Normalized 0.0 - 1.0 (left to right)
    y: float  # Normalized 0.0 - 1.0 (top to bottom)
    z: float  # Relative depth
    visibility: float = 1.0


@dataclass
class HandTrackingResult:
    detected: bool
    landmarks: List[HandLandmark]
    index_tip: Optional[Tuple[float, float]]  # (x, y) normalized
    thumb_tip: Optional[Tuple[float, float]]  # (x, y) normalized
    wrist: Optional[Tuple[float, float]]
    pinch_distance: float  # Euclidean distance between index and thumb tip
    is_open_palm: bool
    handedness: str  # "Right" or "Left"


class HandDetector:
    """MediaPipe-based hand detector with high performance and zero network calls."""

    def __init__(
        self,
        static_image_mode: bool = False,
        max_num_hands: int = 1,
        min_detection_confidence: float = 0.7,
        min_tracking_confidence: float = 0.6,
    ):
        self.min_detection_confidence = min_detection_confidence
        self.min_tracking_confidence = min_tracking_confidence
        self._mp_hands = None
        self._hands = None
        self._mp_draw = None

        try:
            import mediapipe as mp
            self._mp_hands = mp.solutions.hands
            self._mp_draw = mp.solutions.drawing_utils
            self._mp_drawing_styles = mp.solutions.drawing_styles
            self._hands = self._mp_hands.Hands(
                static_image_mode=static_image_mode,
                max_num_hands=max_num_hands,
                min_detection_confidence=min_detection_confidence,
                min_tracking_confidence=min_tracking_confidence,
            )
        except ImportError:
            # Fallback or stub for unit testing without binary C++ mediapipe wheel
            self._hands = None

    def process_frame(self, frame_bgr: np.ndarray) -> HandTrackingResult:
        """Processes a BGR image frame and outputs normalized hand metrics."""
        if frame_bgr is None or self._hands is None:
            return HandTrackingResult(
                detected=False,
                landmarks=[],
                index_tip=None,
                thumb_tip=None,
                wrist=None,
                pinch_distance=1.0,
                is_open_palm=False,
                handedness="Unknown",
            )

        # Convert to RGB for MediaPipe
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        results = self._hands.process(frame_rgb)

        if not results.multi_hand_landmarks:
            return HandTrackingResult(
                detected=False,
                landmarks=[],
                index_tip=None,
                thumb_tip=None,
                wrist=None,
                pinch_distance=1.0,
                is_open_palm=False,
                handedness="Unknown",
            )

        # Take primary hand
        hand_landmarks_raw = results.multi_hand_landmarks[0]
        handedness_label = "Right"
        if results.multi_handedness and len(results.multi_handedness) > 0:
            handedness_label = results.multi_handedness[0].classification[0].label

        landmarks: List[HandLandmark] = []
        for lm in hand_landmarks_raw.landmark:
            landmarks.append(HandLandmark(x=float(lm.x), y=float(lm.y), z=float(lm.z)))

        index_lm = landmarks[INDEX_TIP]
        thumb_lm = landmarks[THUMB_TIP]
        wrist_lm = landmarks[WRIST]

        index_tip = (index_lm.x, index_lm.y)
        thumb_tip = (thumb_lm.x, thumb_lm.y)
        wrist = (wrist_lm.x, wrist_lm.y)

        # Euclidean distance in 2D space
        dx = index_lm.x - thumb_lm.x
        dy = index_lm.y - thumb_lm.y
        pinch_dist = float(np.sqrt(dx * dx + dy * dy))

        # Open palm check: all 4 fingertips (index, middle, ring, pinky) are above their respective PIP joints
        is_open_palm = self._check_open_palm(landmarks)

        return HandTrackingResult(
            detected=True,
            landmarks=landmarks,
            index_tip=index_tip,
            thumb_tip=thumb_tip,
            wrist=wrist,
            pinch_distance=pinch_dist,
            is_open_palm=is_open_palm,
            handedness=handedness_label,
        )

    def _check_open_palm(self, lms: List[HandLandmark]) -> bool:
        """Determines if the hand is an open palm facing the camera (pause gesture)."""
        if len(lms) < 21:
            return False
        # Fingertips extended away from palm base
        wrist = lms[WRIST]
        extended_count = 0
        tips_pips = [
            (INDEX_TIP, INDEX_PIP),
            (MIDDLE_TIP, MIDDLE_PIP),
            (RING_TIP, RING_PIP),
            (PINKY_TIP, PINKY_PIP),
        ]
        for tip_idx, pip_idx in tips_pips:
            # In normalized image coordinates, y=0 is top. If fingertip is higher than PIP, y_tip < y_pip
            dist_tip = (lms[tip_idx].x - wrist.x) ** 2 + (lms[tip_idx].y - wrist.y) ** 2
            dist_pip = (lms[pip_idx].x - wrist.x) ** 2 + (lms[pip_idx].y - wrist.y) ** 2
            if dist_tip > dist_pip:
                extended_count += 1

        return extended_count >= 4

    def draw_skeleton(self, frame_bgr: np.ndarray, result: HandTrackingResult) -> np.ndarray:
        """Renders hand connection skeleton and key points onto the image."""
        if not result.detected or self._mp_draw is None or not result.landmarks:
            return frame_bgr

        h, w, _ = frame_bgr.shape
        # Draw skeleton lines
        connections = [
            (0, 1), (1, 2), (2, 3), (3, 4),      # Thumb
            (0, 5), (5, 6), (6, 7), (7, 8),      # Index
            (5, 9), (9, 10), (10, 11), (11, 12), # Middle
            (9, 13), (13, 14), (14, 15), (15, 16), # Ring
            (13, 17), (17, 18), (18, 19), (19, 20), (0, 17) # Pinky & Palm
        ]

        # Draw lines
        for start_idx, end_idx in connections:
            pt1 = (int(result.landmarks[start_idx].x * w), int(result.landmarks[start_idx].y * h))
            pt2 = (int(result.landmarks[end_idx].x * w), int(result.landmarks[end_idx].y * h))
            cv2.line(frame_bgr, pt1, pt2, (180, 220, 255), 2, cv2.LINE_AA)

        # Draw joints
        for idx, lm in enumerate(result.landmarks):
            cx, cy = int(lm.x * w), int(lm.y * h)
            if idx in (INDEX_TIP, THUMB_TIP):
                # Accentuate index tip & thumb tip
                cv2.circle(frame_bgr, (cx, cy), 8, (0, 225, 255), -1, cv2.LINE_AA)
                cv2.circle(frame_bgr, (cx, cy), 12, (255, 255, 255), 2, cv2.LINE_AA)
            else:
                cv2.circle(frame_bgr, (cx, cy), 4, (100, 180, 255), -1, cv2.LINE_AA)

        return frame_bgr

    def close(self):
        """Releases mediapipe resources."""
        if self._hands is not None:
            try:
                self._hands.close()
            except Exception:
                pass
            self._hands = None
