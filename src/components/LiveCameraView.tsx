import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Sparkles,
  Hand,
  ShieldAlert,
  Sliders,
  FlipHorizontal,
  Eye,
  EyeOff,
  Target,
} from 'lucide-react';
import { GestureState, EngineSettings, HandTrackingData } from '../types';
import {
  initHandLandmarker,
  processVideoFrame,
  drawHandSkeleton,
  isHandTrackerReady,
  getHandTrackerError,
} from '../handTracker';

interface LiveCameraViewProps {
  onCursorMove: (normX: number, normY: number) => void;
  onPinchState: (isPinching: boolean, pinchDistance: number) => void;
  onOpenPalm: (isOpenPalm: boolean) => void;
  onTrackingData?: (data: HandTrackingData) => void;
  onOpenCalibration?: () => void;
  gestureState: GestureState;
  isEmergencyStopped: boolean;
  settings: EngineSettings;
}

export const LiveCameraView: React.FC<LiveCameraViewProps> = ({
  onCursorMove,
  onPinchState,
  onOpenPalm,
  onTrackingData,
  onOpenCalibration,
  gestureState,
  isEmergencyStopped,
  settings,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [modelReady, setModelReady] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(30);

  // Tracking metrics
  const [handDetected, setHandDetected] = useState<boolean>(false);
  const [handConfidence, setHandConfidence] = useState<number>(0);
  const [handednessLabel, setHandednessLabel] = useState<string>('Right');
  const [livePinchDist, setLivePinchDist] = useState<number>(0.1);

  // Fallback simulated finger coordinates when camera is off
  const [simPos, setSimPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [isSimPinching, setIsSimPinching] = useState<boolean>(false);
  const [simPalm, setSimPalm] = useState<boolean>(false);

  // EMA filter coordinates
  const filteredCoord = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  // Pre-load MediaPipe HandLandmarker in background
  useEffect(() => {
    let isMounted = true;
    setModelLoading(true);
    initHandLandmarker()
      .then((instance) => {
        if (!isMounted) return;
        setModelLoading(false);
        if (instance) {
          setModelReady(true);
        } else {
          const err = getHandTrackerError();
          if (err) setCameraError(err);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setModelLoading(false);
        setCameraError(err instanceof Error ? err.message : 'فشل تحميل نموذج تتبع اليد');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Camera toggle handler
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('متصفحك لا يدعم الوصول المباشر للكاميرا في هذه البيئة.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);

        // Ensure model is ready
        if (!isHandTrackerReady()) {
          setModelLoading(true);
          await initHandLandmarker();
          setModelLoading(false);
          setModelReady(isHandTrackerReady());
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر تشغيل الكاميرا';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setHandDetected(false);
  };

  // Main Render & Detection Loop
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const now = performance.now();
    let rawCursorX = simPos.x;
    let rawCursorY = simPos.y;
    let isPinching = isSimPinching;
    let pinchDist = isPinching ? 0.03 : 0.09;
    let isOpenPalm = simPalm;
    let isDetected = false;

    // 1. Video frame rendering and real MediaPipe processing
    if (cameraActive && videoRef.current && videoRef.current.readyState >= 2) {
      const video = videoRef.current;

      // Draw mirrored or direct video feed
      ctx.save();
      if (settings.mirrorCamera) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      // Process frame with MediaPipe HandLandmarker
      const trackingData = processVideoFrame(video, now, settings.mirrorCamera);
      if (onTrackingData) {
        onTrackingData(trackingData);
      }

      if (trackingData.detected && trackingData.indexTip) {
        isDetected = true;
        setHandDetected(true);
        setHandConfidence(trackingData.confidence);
        setHandednessLabel(trackingData.handedness);
        setLivePinchDist(trackingData.pinchDistance);

        // Draw calibrated comfort zone outline on canvas to guide the user
        const zX1 = settings.zoneXMin * w;
        const zX2 = settings.zoneXMax * w;
        const zY1 = settings.zoneYMin * h;
        const zY2 = settings.zoneYMax * h;

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(zX1, zY1, zX2 - zX1, zY2 - zY1);
        ctx.setLineDash([]);

        // Map raw index tip coordinates from user calibrated zone [zoneXMin..zoneXMax] to [0..1]
        const normZoneX = (trackingData.indexTip.x - settings.zoneXMin) / Math.max(0.1, settings.zoneXMax - settings.zoneXMin);
        const normZoneY = (trackingData.indexTip.y - settings.zoneYMin) / Math.max(0.1, settings.zoneYMax - settings.zoneYMin);

        rawCursorX = Math.max(0, Math.min(1, normZoneX));
        rawCursorY = Math.max(0, Math.min(1, normZoneY));

        pinchDist = trackingData.pinchDistance;
        isPinching = pinchDist <= settings.pinchThreshold;
        isOpenPalm = trackingData.isOpenPalm;

        // Draw hand skeleton if enabled
        if (settings.showSkeleton) {
          drawHandSkeleton(ctx, trackingData.landmarks, w, h, isPinching);
        }
      } else {
        setHandDetected(false);
      }
    } else {
      // Camera is off -> Dark cybernetic grid background for pointer simulation
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      const step = 32;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      isDetected = true; // pointer simulator is active
    }

    // 2. Apply Exponential Moving Average (EMA) smoothing
    const alpha = settings.smoothingAlpha;
    filteredCoord.current.x = alpha * rawCursorX + (1 - alpha) * filteredCoord.current.x;
    filteredCoord.current.y = alpha * rawCursorY + (1 - alpha) * filteredCoord.current.y;

    const cursorPxX = filteredCoord.current.x * w;
    const cursorPxY = filteredCoord.current.y * h;

    // Report smoothed coordinates and states to parent
    onCursorMove(filteredCoord.current.x, filteredCoord.current.y);

    if (!isEmergencyStopped) {
      onPinchState(isPinching, pinchDist);
      onOpenPalm(isOpenPalm);

      if (isOpenPalm) {
        // Open palm pause overlay
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 18px Cairo';
        ctx.textAlign = 'center';
        ctx.fillText('✋ الكف مفتوح — تم إيقاف الإدخال مؤقتاً لحمايتك', w / 2, h / 2);
      } else if (isDetected) {
        // Laser Fingertip Target Ring
        const ringColor = isPinching ? '#22c55e' : '#06b6d4';
        const ringRadius = isPinching ? 26 : 20;

        // Outer glow
        const grad = ctx.createRadialGradient(
          cursorPxX,
          cursorPxY,
          2,
          cursorPxX,
          cursorPxY,
          ringRadius + 16
        );
        grad.addColorStop(0, isPinching ? 'rgba(34, 197, 94, 0.45)' : 'rgba(6, 182, 212, 0.4)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cursorPxX, cursorPxY, ringRadius + 16, 0, Math.PI * 2);
        ctx.fill();

        // Ring
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cursorPxX, cursorPxY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Center crosshair dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cursorPxX, cursorPxY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cursorPxX - 16, cursorPxY);
        ctx.lineTo(cursorPxX + 16, cursorPxY);
        ctx.moveTo(cursorPxX, cursorPxY - 16);
        ctx.lineTo(cursorPxX, cursorPxY + 16);
        ctx.stroke();
      } else if (cameraActive) {
        // Hand not detected overlay
        ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 16px Cairo';
        ctx.textAlign = 'center';
        ctx.fillText('ضع يدك أمام الكاميرا لبدء الكتابة في الهواء', w / 2, h / 2);
      }
    } else {
      // Emergency stop graphic
      ctx.fillStyle = 'rgba(220, 38, 38, 0.25)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 20px Cairo';
      ctx.textAlign = 'center';
      ctx.fillText('🛑 الإدخال موقوف فورياً للطوارئ', w / 2, h / 2);
    }

    // FPS computation
    frameCountRef.current++;
    if (now - lastTimeRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)));
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
  }, [
    cameraActive,
    isEmergencyStopped,
    isSimPinching,
    onCursorMove,
    onOpenPalm,
    onPinchState,
    onTrackingData,
    settings.mirrorCamera,
    settings.pinchThreshold,
    settings.showSkeleton,
    settings.smoothingAlpha,
    settings.zoneXMax,
    settings.zoneXMin,
    settings.zoneYMax,
    settings.zoneYMin,
    simPalm,
    simPos.x,
    simPos.y,
  ]);

  useEffect(() => {
    const loop = () => {
      renderFrame();
      animFrameIdRef.current = requestAnimationFrame(loop);
    };
    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [renderFrame]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Handle pointer air-trace movement for simulation mode when camera is off
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (cameraActive && handDetected) return; // Prioritize real hand
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setSimPos({ x, y });
  };

  const handlePointerDown = () => {
    if (cameraActive && handDetected) return;
    setIsSimPinching(true);
  };

  const handlePointerUp = () => {
    if (cameraActive && handDetected) return;
    setIsSimPinching(false);
  };

  return (
    <div className="relative bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
      {/* Video element hidden, used as frame source for MediaPipe */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
        autoPlay
        width={640}
        height={480}
      />

      {/* Header Bar */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs sm:text-sm gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isEmergencyStopped
                  ? 'bg-rose-400'
                  : cameraActive && handDetected
                  ? 'bg-emerald-400'
                  : cameraActive
                  ? 'bg-amber-400'
                  : 'bg-cyan-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                isEmergencyStopped
                  ? 'bg-rose-500'
                  : cameraActive && handDetected
                  ? 'bg-emerald-500'
                  : cameraActive
                  ? 'bg-amber-500'
                  : 'bg-cyan-500'
              }`}
            />
          </div>
          <span className="font-bold text-slate-200">
            {cameraActive
              ? handDetected
                ? `تتبع اليد نشط (${handednessLabel === 'Right' ? 'اليمنى' : 'اليسرى'} ${Math.round(
                    handConfidence * 100
                  )}%)`
                : 'الكاميرا نشطة — في انتظار اليد'
              : 'محاكي اليد والمؤشر (الكاميرا متوقفة)'}
          </span>
          <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[11px] font-mono">
            {fps} FPS
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCalibration && (
            <button
              onClick={onOpenCalibration}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-700/80 hover:bg-cyan-900 transition text-xs font-bold cursor-pointer"
              title="معايرة منطقة حركة اليد وعتبة الإيماءات"
            >
              <Target className="w-3.5 h-3.5" />
              معايرة اليد
            </button>
          )}

          {cameraActive ? (
            <button
              onClick={stopCamera}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800/60 hover:bg-rose-900/60 transition text-xs font-semibold cursor-pointer"
            >
              <CameraOff className="w-3.5 h-3.5" />
              إيقاف الكاميرا
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition text-xs font-bold cursor-pointer shadow-md shadow-cyan-500/20"
            >
              <Camera className="w-3.5 h-3.5" />
              تشغيل الكاميرا الحقيقية
            </button>
          )}

          <button
            onClick={() => setSimPalm(!simPalm)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
              simPalm
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
            title="اختبار إيماءة الكف المفتوح للإيقاف المؤقت"
          >
            <Hand className="w-3.5 h-3.5" />
            {simPalm ? 'استئناف الكتابة' : 'كف مفتوح (توقف)'}
          </button>
        </div>
      </div>

      {modelLoading && (
        <div className="px-4 py-2 bg-cyan-950/70 border-b border-cyan-800/60 text-cyan-300 text-xs flex items-center gap-2 animate-pulse">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>جاري تحميل نموذج رؤية اليد MediaPipe Hand Landmarker...</span>
        </div>
      )}

      {cameraError && (
        <div className="px-4 py-2 bg-amber-950/60 border-b border-amber-800/60 text-amber-300 text-xs flex items-center justify-between">
          <span>{cameraError}</span>
          <button onClick={() => setCameraError(null)} className="underline cursor-pointer">
            إغلاق
          </button>
        </div>
      )}

      {/* Main Interactive Canvas Area */}
      <div className="relative aspect-[16/9] w-full bg-slate-950 flex items-center justify-center select-none overflow-hidden group">
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="w-full h-full object-contain cursor-crosshair touch-none"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {/* Live Tracking Status Badge Overlay */}
        <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none shadow-lg">
          <div
            className={`w-2 h-2 rounded-full ${
              gestureState === 'TRIGGERED' || gestureState === 'PINCH_POTENTIAL' || gestureState === 'DWELLING'
                ? 'bg-emerald-400 animate-pulse'
                : gestureState === 'WAIT_RELEASE'
                ? 'bg-amber-400'
                : gestureState === 'PALM_PAUSED'
                ? 'bg-blue-400'
                : gestureState === 'EMERGENCY_STOPPED'
                ? 'bg-rose-400'
                : cameraActive && handDetected
                ? 'bg-cyan-400'
                : 'bg-slate-400'
            }`}
          />
          <span className="text-xs font-bold text-slate-200">
            {gestureState === 'TRIGGERED' && '✓ تم تأكيد الحرف!'}
            {gestureState === 'PINCH_POTENTIAL' && 'ضم السبابة والإبهام...'}
            {gestureState === 'DWELLING' && 'جاري التثبيت لتأكيد الحرف...'}
            {gestureState === 'WAIT_RELEASE' && 'حرر الإصبع للانتقال للحرف التالي'}
            {gestureState === 'PALM_PAUSED' && 'كف مفتوح (توقف مؤقت)'}
            {gestureState === 'EMERGENCY_STOPPED' && '🛑 توقف فوري!'}
            {gestureState === 'IDLE' &&
              (cameraActive
                ? handDetected
                  ? 'اليد جاهزة — وجّه السبابة نحو الحرف'
                  : 'ضع يدك أمام الكاميرا'
                : 'وضع المحاكاة: حرك المؤشر واضغط للتأكيد')}
            {gestureState === 'NO_HAND' && 'في انتظار اليد'}
          </span>
        </div>

        {/* Live Distance Gauge when Hand is Tracked */}
        {cameraActive && handDetected && (
          <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3 py-1 rounded-lg text-[11px] font-mono text-cyan-300 pointer-events-none flex items-center gap-2">
            <span>مسافة الضم: {livePinchDist.toFixed(3)}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                livePinchDist <= settings.pinchThreshold ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
          </div>
        )}

        {/* User Interaction Guide Tip */}
        <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 px-3 py-1 rounded-lg text-[11px] text-slate-400 pointer-events-none">
          {cameraActive
            ? handDetected
              ? settings.selectionMode === 'dwell'
                ? 'ثبّت السبابة فوق الحرف لتأكيده بالتثبيت'
                : 'حرّك السبابة واضممها مع الإبهام لتأكيد الحرف'
              : 'ضع يدك بوضوح أمام الكاميرا'
            : 'يمكنك استخدام الماوس كخيار بديل، أو تشغيل الكاميرا للكتابة في الهواء'}
        </div>
      </div>
    </div>
  );
};
