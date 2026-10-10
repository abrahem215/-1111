/**
 * AirType AI - Browser MediaPipe Hand Tracker
 * Initializes MediaPipe Tasks Vision HandLandmarker for real-time video frame processing.
 */

import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { HandTrackingData, HandLandmarkPoint } from './types';

let handLandmarkerInstance: HandLandmarker | null = null;
let isInitializing = false;
let initError: string | null = null;

export async function initHandLandmarker(): Promise<HandLandmarker | null> {
  if (handLandmarkerInstance) return handLandmarkerInstance;
  if (isInitializing) {
    // Wait until initialized
    while (isInitializing) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return handLandmarkerInstance;
  }

  isInitializing = true;
  initError = null;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    handLandmarkerInstance = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    isInitializing = false;
    return handLandmarkerInstance;
  } catch (err: unknown) {
    console.warn('Failed to load GPU MediaPipe hand landmarker, trying CPU fallback...', err);
    try {
      // CPU fallback
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      handLandmarkerInstance = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      isInitializing = false;
      return handLandmarkerInstance;
    } catch (fallbackErr: unknown) {
      const msg = fallbackErr instanceof Error ? fallbackErr.message : 'تعذر تحميل نموذج تتبع اليد MediaPipe';
      initError = msg;
      isInitializing = false;
      console.error('MediaPipe HandLandmarker init error:', fallbackErr);
      return null;
    }
  }
}

export function getHandTrackerError(): string | null {
  return initError;
}

export function isHandTrackerReady(): boolean {
  return handLandmarkerInstance !== null;
}

export function processVideoFrame(
  video: HTMLVideoElement,
  timestampMs: number,
  mirror: boolean = true
): HandTrackingData {
  const emptyData: HandTrackingData = {
    detected: false,
    landmarks: [],
    indexTip: null,
    thumbTip: null,
    wrist: null,
    pinchDistance: 1.0,
    isOpenPalm: false,
    handedness: 'Unknown',
    confidence: 0,
  };

  if (!handLandmarkerInstance || video.readyState < 2) {
    return emptyData;
  }

  try {
    const result: HandLandmarkerResult = handLandmarkerInstance.detectForVideo(video, timestampMs);

    if (!result.landmarks || result.landmarks.length === 0 || result.landmarks[0].length < 21) {
      return emptyData;
    }

    const rawLandmarks = result.landmarks[0];
    const handednessLabel =
      result.handednesses && result.handednesses[0] && result.handednesses[0][0]
        ? (result.handednesses[0][0].displayName as 'Right' | 'Left')
        : 'Right';
    const confidenceScore =
      result.handednesses && result.handednesses[0] && result.handednesses[0][0]
        ? result.handednesses[0][0].score
        : 0.85;

    // Convert landmarks with mirroring adjustment if requested
    const landmarks: HandLandmarkPoint[] = rawLandmarks.map((pt) => ({
      x: mirror ? 1.0 - pt.x : pt.x,
      y: pt.y,
      z: pt.z,
    }));

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];

    // Pinch distance in normalized 2D space
    const dx = indexTip.x - thumbTip.x;
    const dy = indexTip.y - thumbTip.y;
    const pinchDistance = Math.sqrt(dx * dx + dy * dy);

    // Open palm check: all 4 fingertips (8, 12, 16, 20) are farther from wrist than PIP joints (6, 10, 14, 18)
    const tipPipPairs = [
      [8, 6],   // Index
      [12, 10], // Middle
      [16, 14], // Ring
      [20, 18], // Pinky
    ];

    let extendedCount = 0;
    for (const [tipIdx, pipIdx] of tipPipPairs) {
      const tip = landmarks[tipIdx];
      const pip = landmarks[pipIdx];
      const distTipSq = (tip.x - wrist.x) ** 2 + (tip.y - wrist.y) ** 2;
      const distPipSq = (pip.x - wrist.x) ** 2 + (pip.y - wrist.y) ** 2;
      if (distTipSq > distPipSq) {
        extendedCount++;
      }
    }

    const isOpenPalm = extendedCount >= 4 && pinchDistance > 0.12;

    return {
      detected: true,
      landmarks,
      indexTip: { x: indexTip.x, y: indexTip.y },
      thumbTip: { x: thumbTip.x, y: thumbTip.y },
      wrist: { x: wrist.x, y: wrist.y },
      pinchDistance,
      isOpenPalm,
      handedness: handednessLabel,
      confidence: confidenceScore,
    };
  } catch (err) {
    // If timestamp wasn't monotonic or other transient frame error
    return emptyData;
  }
}

/**
 * Draws the 21 MediaPipe landmarks and skeletal connections on a 2D canvas.
 */
export function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: HandLandmarkPoint[],
  width: number,
  height: number,
  isPinching: boolean
) {
  if (!landmarks || landmarks.length < 21) return;

  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],       // Index
    [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
    [9, 13], [13, 14], [14, 15], [15, 16],// Ring
    [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
    [0, 17],                              // Palm base
  ];

  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = isPinching ? 'rgba(34, 197, 94, 0.75)' : 'rgba(56, 189, 248, 0.65)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw lines
  for (const [start, end] of connections) {
    const pt1 = landmarks[start];
    const pt2 = landmarks[end];
    ctx.beginPath();
    ctx.moveTo(pt1.x * width, pt1.y * height);
    ctx.lineTo(pt2.x * width, pt2.y * height);
    ctx.stroke();
  }

  // Draw joints
  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i];
    const px = pt.x * width;
    const py = pt.y * height;

    if (i === 8 || i === 4) {
      // Key fingertips: Index and Thumb
      ctx.fillStyle = i === 8 ? (isPinching ? '#22c55e' : '#06b6d4') : '#f59e0b';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.9)';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
