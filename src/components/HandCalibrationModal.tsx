import React, { useState, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  Move,
  Target,
  Sliders,
  Check,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import { CalibrationProfile, HandTrackingData, SelectionMode } from '../types';

interface HandCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackingData: HandTrackingData;
  cameraActive: boolean;
  onApplyProfile: (profile: CalibrationProfile) => void;
  currentProfile: CalibrationProfile;
}

export const HandCalibrationModal: React.FC<HandCalibrationModalProps> = ({
  isOpen,
  onClose,
  trackingData,
  cameraActive,
  onApplyProfile,
  currentProfile,
}) => {
  const [step, setStep] = useState<number>(1);

  // Calibration draft profile
  const [draft, setDraft] = useState<CalibrationProfile>({ ...currentProfile });

  // Step 3: Targets calibration state
  const targetPoints = [
    { id: 'top-left', label: 'الركن العلوي الأيمن', x: 0.25, y: 0.25 },
    { id: 'top-right', label: 'الركن العلوي الأيسر', x: 0.75, y: 0.25 },
    { id: 'bottom-left', label: 'الركن السفلي الأيمن', x: 0.25, y: 0.75 },
    { id: 'bottom-right', label: 'الركن السفلي الأيسر', x: 0.75, y: 0.75 },
  ];
  const [currentTargetIdx, setCurrentTargetIdx] = useState<number>(0);
  const [targetScores, setTargetScores] = useState<number[]>([]);
  const [targetHoldTimer, setTargetHoldTimer] = useState<number>(0);

  // Step 4: Gesture test state
  const [pinchTested, setPinchTested] = useState<boolean>(false);
  const [dwellTested, setDwellTested] = useState<boolean>(false);

  // Step 5: Typing test state
  const testLetters = ['أ', 'ي', 'ر'];
  const [testLetterIdx, setTestLetterIdx] = useState<number>(0);
  const [testedHits, setTestedHits] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDraft({ ...currentProfile });
      setStep(1);
      setCurrentTargetIdx(0);
      setTargetScores([]);
      setTargetHoldTimer(0);
      setPinchTested(false);
      setDwellTested(false);
      setTestLetterIdx(0);
      setTestedHits([]);
    }
  }, [currentProfile, isOpen]);

  // Monitor target aiming in step 3
  useEffect(() => {
    if (step !== 3 || !trackingData.detected || !trackingData.indexTip) return;

    const target = targetPoints[currentTargetIdx];
    if (!target) return;

    // Check distance between index tip and target
    const dx = trackingData.indexTip.x - target.x;
    const dy = trackingData.indexTip.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.12) {
      setTargetHoldTimer((prev) => {
        if (prev >= 20) {
          // Point reached!
          setTargetScores((s) => [...s, Math.round((1 - dist) * 100)]);
          setCurrentTargetIdx((idx) => idx + 1);
          return 0;
        }
        return prev + 1;
      });
    } else {
      setTargetHoldTimer(0);
    }
  }, [currentTargetIdx, step, targetPoints, trackingData]);

  // Check gesture in step 4
  useEffect(() => {
    if (step !== 4 || !trackingData.detected) return;

    if (trackingData.pinchDistance <= draft.pinchThreshold) {
      setPinchTested(true);
    }
  }, [draft.pinchThreshold, step, trackingData]);

  if (!isOpen) return null;

  const handleSaveAndApply = () => {
    const updated: CalibrationProfile = {
      ...draft,
      calibratedAt: new Date().toISOString(),
    };
    onApplyProfile(updated);
    try {
      localStorage.setItem('airtype_calibration_profile', JSON.stringify(updated));
    } catch {
      // Local storage fallback
    }
    onClose();
  };

  const handleResetDefaults = () => {
    const defaultProfile: CalibrationProfile = {
      zoneXMin: 0.15,
      zoneXMax: 0.85,
      zoneYMin: 0.20,
      zoneYMax: 0.85,
      pinchThreshold: 0.055,
      dwellTimeMs: 700,
      selectionMode: 'both',
      mirrorCamera: true,
      smoothingAlpha: 0.35,
      cooldownMs: 300,
    };
    setDraft(defaultProfile);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Hand Calibration — معايرة اليد وتخصيص الكاميرا
              </h2>
              <p className="text-xs text-slate-400">
                اضبط دقة التتبع ومجال حركة اليد وعتبة الإيماءات لتلائم حركتك بدقة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Tabs Indicator */}
        <div className="px-6 pt-3 pb-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs font-bold gap-1 overflow-x-auto">
          {[
            { num: 1, label: '1. فحص الكاميرا' },
            { num: 2, label: '2. منطقة العمل' },
            { num: 3, label: '3. معايرة السبابة' },
            { num: 4, label: '4. ضبط الإيماءة' },
            { num: 5, label: '5. اختبار الكتابة' },
          ].map((st) => (
            <button
              key={st.num}
              onClick={() => setStep(st.num)}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                step === st.num
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-extrabold'
                  : step > st.num
                  ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{st.label}</span>
              {step > st.num && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>

        {/* Modal Body: Steps 1 to 5 */}
        <div className="p-6 flex-1 flex flex-col gap-5 min-h-[360px] text-xs sm:text-sm">
          {/* STEP 1: Camera & Hand Check */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Camera className="w-4 h-4" />
                <span>الخطوة الأولى: التحقق من الكاميرا واكتشاف اليد</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                تأكد من أن الكاميرا قيد التشغيل ويدك تظهر بوضوح في الإضاءة الحالية.
              </p>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">حالة الكاميرا:</span>
                  <span
                    className={`font-bold flex items-center gap-1.5 ${
                      cameraActive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {cameraActive ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> الكاميرا تعمل بنشاط
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" /> الكاميرا غير مشغلة (يرجى تفعيلها من الشاشة الرئيسية)
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">حالة اكتشاف اليد (MediaPipe):</span>
                  <span
                    className={`font-bold flex items-center gap-1.5 ${
                      trackingData.detected ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {trackingData.detected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> اليد مكتشفة ({trackingData.handedness === 'Right' ? 'اليمنى' : 'اليسرى'} - ثقة {Math.round(trackingData.confidence * 100)}%)
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" /> ضع يدك أمام عدسة الكاميرا
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">طرف السبابة (Index Tip):</span>
                  <span className="font-mono text-cyan-300">
                    {trackingData.indexTip
                      ? `X: ${trackingData.indexTip.x.toFixed(2)}, Y: ${trackingData.indexTip.y.toFixed(2)}`
                      : 'غير مرئي'}
                  </span>
                </div>
              </div>

              {trackingData.detected && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>ممتاز! تم اكتشاف اليد بنجاح. يمكنك المتابعة إلى الخطوة التالية.</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Working Zone Bounding Box */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Move className="w-4 h-4" />
                <span>الخطوة الثانية: تحديد منطقة العمل المريحة (Hand Comfort Zone)</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                بدلاً من الاضطرار إلى مد يدك لأقصى حواف الكاميرا، يقوم AirType AI بتوسيع حركة يدك في المنطقة المريحة لتغطي كافة أبعاد الكيبورد.
              </p>

              {/* Sliders for Zone bounds */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>الحد الأيسر (X Min):</span>
                    <span className="font-mono text-cyan-400">{draft.zoneXMin.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.40"
                    step="0.05"
                    value={draft.zoneXMin}
                    onChange={(e) => setDraft({ ...draft, zoneXMin: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>الحد الأيمن (X Max):</span>
                    <span className="font-mono text-cyan-400">{draft.zoneXMax.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.60"
                    max="0.95"
                    step="0.05"
                    value={draft.zoneXMax}
                    onChange={(e) => setDraft({ ...draft, zoneXMax: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>الحد الأعلى (Y Min):</span>
                    <span className="font-mono text-cyan-400">{draft.zoneYMin.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.45"
                    step="0.05"
                    value={draft.zoneYMin}
                    onChange={(e) => setDraft({ ...draft, zoneYMin: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>الحد الأدنى (Y Max):</span>
                    <span className="font-mono text-cyan-400">{draft.zoneYMax.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.65"
                    max="0.95"
                    step="0.05"
                    value={draft.zoneYMax}
                    onChange={(e) => setDraft({ ...draft, zoneYMax: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">إعدادات مسبقة سريعة:</span>
                <button
                  onClick={() => setDraft({ ...draft, zoneXMin: 0.15, zoneXMax: 0.85, zoneYMin: 0.20, zoneYMax: 0.85 })}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  طبيعي (متوازن)
                </button>
                <button
                  onClick={() => setDraft({ ...draft, zoneXMin: 0.25, zoneXMax: 0.75, zoneYMin: 0.25, zoneYMax: 0.75 })}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  مدمج (حركة يد صغيرة)
                </button>
                <button
                  onClick={() => setDraft({ ...draft, zoneXMin: 0.05, zoneXMax: 0.95, zoneYMin: 0.10, zoneYMax: 0.95 })}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  واسع (حركة يد حرة)
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Index Finger Targeting */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Target className="w-4 h-4" />
                <span>الخطوة الثالثة: معايرة موضع السبابة على نقاط الشاشة</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                وجّه سبابتك نحو الهدف المضيء وثبتها لثانية واحدة لمطابقة إحداثيات الكاميرا مع الشاشة.
              </p>

              {currentTargetIdx < targetPoints.length ? (
                <div className="relative aspect-[16/9] w-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center">
                  {/* Current Target */}
                  {(() => {
                    const t = targetPoints[currentTargetIdx];
                    return (
                      <div
                        style={{
                          left: `${t.x * 100}%`,
                          top: `${t.y * 100}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className="absolute flex flex-col items-center gap-1"
                      >
                        <div className="relative flex items-center justify-center">
                          <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-cyan-400 opacity-75" />
                          <div className="w-8 h-8 rounded-full bg-cyan-500 border-2 border-white flex items-center justify-center font-bold text-slate-950 text-xs shadow-lg shadow-cyan-500/50">
                            {currentTargetIdx + 1}
                          </div>
                        </div>
                        <span className="bg-slate-900/90 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-800">
                          {t.label}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Finger pointer reflection */}
                  {trackingData.indexTip && (
                    <div
                      style={{
                        left: `${trackingData.indexTip.x * 100}%`,
                        top: `${trackingData.indexTip.y * 100}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="absolute w-5 h-5 rounded-full border-2 border-emerald-400 bg-emerald-500/40 pointer-events-none"
                    />
                  )}

                  {/* Progress of holding */}
                  <div className="absolute bottom-3 left-3 bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-800 text-xs text-slate-300">
                    الهدف: {currentTargetIdx + 1} من 4 • الثبات: {Math.min(100, targetHoldTimer * 5)}%
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-white text-base">اكتملت معايرة مواضع السبابة بنجاح!</h4>
                  <p className="text-slate-400 text-xs">
                    متوسط دقة التتبع: {Math.round(targetScores.reduce((a, b) => a + b, 0) / Math.max(1, targetScores.length))}%
                  </p>
                  <button
                    onClick={() => {
                      setCurrentTargetIdx(0);
                      setTargetScores([]);
                    }}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> إعادة المعايرة
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Gesture Tuning (Pinch vs Dwell) */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Sliders className="w-4 h-4" />
                <span>الخطوة الرابعة: اختيار وضبط إيماءة تأكيد الحرف</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                اختر الطريقة الأكثر راحة لك لتأكيد الحرف في الهواء: ضم السبابة والإبهام، أو التثبيت الزمني فوق الحرف (Dwell Selection).
              </p>

              {/* Mode Selection */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    id: 'pinch',
                    title: 'ضم الأصابع (Pinch)',
                    desc: 'ضم طرف السبابة والإبهام معاً كالنقر الحقيقي',
                  },
                  {
                    id: 'dwell',
                    title: 'التثبيت (Dwell)',
                    desc: 'إبقاء السبابة فوق الحرف لـ 0.7 ثانية دون ضم',
                  },
                  {
                    id: 'both',
                    title: 'كلا الطريقتين معاً',
                    desc: 'استخدام الضم أو التثبيت حسب رغبتك',
                  },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setDraft({ ...draft, selectionMode: m.id as SelectionMode })}
                    className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col gap-1 ${
                      draft.selectionMode === m.id
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-100 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    <span className="font-bold text-white text-xs">{m.title}</span>
                    <span className="text-[11px] text-slate-400 leading-tight">{m.desc}</span>
                  </button>
                ))}
              </div>

              {/* Threshold Sliders */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-xs">
                {(draft.selectionMode === 'pinch' || draft.selectionMode === 'both') && (
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>عتبة مسافة الضم (Pinch Distance Threshold):</span>
                      <span className="font-mono text-cyan-400">{draft.pinchThreshold.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.025"
                      max="0.100"
                      step="0.005"
                      value={draft.pinchThreshold}
                      onChange={(e) => setDraft({ ...draft, pinchThreshold: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                    <div className="mt-1 text-[11px] text-slate-400 flex justify-between">
                      <span>المسافة اللحظية المقاسة: {trackingData.pinchDistance.toFixed(3)}</span>
                      <span className={trackingData.pinchDistance <= draft.pinchThreshold ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {trackingData.pinchDistance <= draft.pinchThreshold ? '✓ تم اكتشاف الضم' : 'أصابع مفتوحة'}
                      </span>
                    </div>
                  </div>
                )}

                {(draft.selectionMode === 'dwell' || draft.selectionMode === 'both') && (
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>زمن التثبيت فوق الحرف (Dwell Time):</span>
                      <span className="font-mono text-cyan-400">{draft.dwellTimeMs} ms</span>
                    </div>
                    <input
                      type="range"
                      min="400"
                      max="1200"
                      step="50"
                      value={draft.dwellTimeMs}
                      onChange={(e) => setDraft({ ...draft, dwellTimeMs: parseInt(e.target.value) })}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Live Typing Verification */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>الخطوة الخامسة: اختبار عملي لكتابة الحروف في الهواء</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                جرّب كتابة الحروف الثلاثة التالية في الهواء للتأكد من نجاح المعايرة وتطبيقها:
              </p>

              <div className="flex items-center justify-center gap-4 py-4">
                {testLetters.map((l, idx) => {
                  const isDone = testedHits.includes(l);
                  const isCurrent = idx === testLetterIdx && !isDone;
                  return (
                    <button
                      key={l}
                      onClick={() => {
                        if (!testedHits.includes(l)) {
                          setTestedHits([...testedHits, l]);
                          setTestLetterIdx(idx + 1);
                        }
                      }}
                      className={`w-16 h-16 rounded-2xl border text-xl font-bold flex items-center justify-center transition ${
                        isDone
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300 scale-95 shadow-lg shadow-emerald-500/20'
                          : isCurrent
                          ? 'bg-cyan-500 text-slate-950 border-white animate-bounce shadow-xl shadow-cyan-500/40'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                <span>الحروف المكتملة: {testedHits.length} من {testLetters.length}</span>
                <span className="text-slate-400">
                  {testedHits.length === testLetters.length ? (
                    <span className="text-emerald-400 font-bold">✓ نجح الاختبار بالكامل!</span>
                  ) : (
                    'انقر على الحرف أو أشر إليه للتأكيد'
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-850 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            استعادة الافتراضيات
          </button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                السابق
              </button>
            )}

            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                التالي
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSaveAndApply}
                className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition cursor-pointer shadow-lg shadow-emerald-500/30"
              >
                <Check className="w-4 h-4" />
                حفظ وتطبيق المعايرة
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
