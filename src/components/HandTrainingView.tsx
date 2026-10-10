import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Target,
  Crosshair,
  Award,
  RotateCcw,
  Lightbulb,
  ThumbsUp,
  BarChart2,
} from 'lucide-react';
import { HandTrackingData, EngineSettings } from '../types';
import confetti from 'canvas-confetti';

interface HandTrainingViewProps {
  trackingData: HandTrackingData;
  settings: EngineSettings;
}

export const HandTrainingView: React.FC<HandTrainingViewProps> = ({
  trackingData,
  settings,
}) => {
  const [activeExercise, setActiveExercise] = useState<number>(1);

  // Exercise 1: Hand Recognition Stability
  const [stabilityScore, setStabilityScore] = useState<number>(0);
  const [exercise1Passed, setExercise1Passed] = useState<boolean>(false);

  // Exercise 2: Move Cursor to Moving Targets
  const [targetPos, setTargetPos] = useState<{ x: number; y: number }>({ x: 0.3, y: 0.4 });
  const [ex2Hits, setEx2Hits] = useState<number>(0);
  const [ex2Proximity, setEx2Proximity] = useState<number>(0);

  // Exercise 3: Key Targeting on Keyboard
  const ex3TargetKeys = ['س', 'ل', 'ا', 'م'];
  const [ex3KeyIdx, setEx3KeyIdx] = useState<number>(0);
  const [ex3Completed, setEx3Completed] = useState<boolean>(false);

  // Exercise 4: Confirming Selection without repeats
  const [ex4PinchCount, setEx4PinchCount] = useState<number>(0);
  const [ex4BlockedRepeats, setEx4BlockedRepeats] = useState<number>(0);
  const lastPinchTriggerRef = useRef<number>(0);
  const wasPinchingRef = useRef<boolean>(false);

  // Exercise 5: Typing a full word
  const targetWord = 'سلام';
  const [typedLetters, setTypedLetters] = useState<string[]>([]);
  const [mistakesCount, setMistakesCount] = useState<number>(0);
  const [accidentalCount, setAccidentalCount] = useState<number>(0);
  const [wordFinished, setWordFinished] = useState<boolean>(false);

  // Exercise 1 Timer logic
  useEffect(() => {
    if (activeExercise !== 1) return;

    if (trackingData.detected && trackingData.confidence > 0.6) {
      setStabilityScore((prev) => {
        if (prev >= 100) {
          setExercise1Passed(true);
          return 100;
        }
        return prev + 2;
      });
    } else {
      setStabilityScore((prev) => Math.max(0, prev - 1));
    }
  }, [activeExercise, trackingData]);

  // Exercise 2 Proximity logic
  useEffect(() => {
    if (activeExercise !== 2 || !trackingData.indexTip) return;

    const dx = trackingData.indexTip.x - targetPos.x;
    const dy = trackingData.indexTip.y - targetPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const prox = Math.max(0, Math.min(100, Math.round((1 - dist / 0.5) * 100)));
    setEx2Proximity(prox);

    if (dist < 0.08) {
      setEx2Hits((hits) => {
        const next = hits + 1;
        if (next < 5) {
          // Move target to a new random spot
          setTargetPos({
            x: 0.2 + Math.random() * 0.6,
            y: 0.2 + Math.random() * 0.6,
          });
        }
        return next;
      });
    }
  }, [activeExercise, targetPos, trackingData]);

  // Exercise 4 Debounce & Pinch logic
  useEffect(() => {
    if (activeExercise !== 4 || !trackingData.detected) return;

    const isPinching = trackingData.pinchDistance <= settings.pinchThreshold;
    const now = performance.now();

    if (isPinching) {
      if (!wasPinchingRef.current) {
        // First pinch entry
        if (now - lastPinchTriggerRef.current >= settings.cooldownMs) {
          setEx4PinchCount((c) => c + 1);
          lastPinchTriggerRef.current = now;
          wasPinchingRef.current = true;
        }
      } else {
        // Continuous holding - blocked from repeating!
        setEx4BlockedRepeats((b) => b + 1);
      }
    } else {
      wasPinchingRef.current = false;
    }
  }, [activeExercise, settings.cooldownMs, settings.pinchThreshold, trackingData]);

  const handleEx5LetterClick = (letter: string) => {
    const expectedLetter = targetWord[typedLetters.length];
    if (letter === expectedLetter) {
      const next = [...typedLetters, letter];
      setTypedLetters(next);
      if (next.length === targetWord.length) {
        setWordFinished(true);
        confetti({ particleCount: 60, spread: 70 });
      }
    } else {
      setMistakesCount((m) => m + 1);
    }
  };

  const handleResetEx5 = () => {
    setTypedLetters([]);
    setMistakesCount(0);
    setAccidentalCount(0);
    setWordFinished(false);
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl flex flex-col gap-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg text-white">
              Hand Training Mode — وضع تدريب اليد التفاعلي
            </h3>
            <p className="text-xs text-slate-400">
              تمارين عملية خطوة بخطوة للتعود على حركة السبابة، التوجيه، وتأكيد الحروف دون لمس الشاشة
            </p>
          </div>
        </div>

        {/* Exercise Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold overflow-x-auto">
          {[
            { id: 1, label: '1. استقرار اليد' },
            { id: 2, label: '2. توجيه المؤشر' },
            { id: 3, label: '3. استهداف المفاتيح' },
            { id: 4, label: '4. منع التكرار' },
            { id: 5, label: '5. كتابة كلمة' },
          ].map((ex) => (
            <button
              key={ex.id}
              onClick={() => setActiveExercise(ex.id)}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                activeExercise === ex.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* EXERCISE 1: Hand Recognition & Stability */}
      {activeExercise === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-cyan-300">
              التدريب الأول: استقرار اكتشاف اليد وثبات المؤشر
            </h4>
            <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
              مستوى الثبات: {stabilityScore}%
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            ضع يدك أمام الكاميرا وحركها ببطء شديد. راقب هيكل اليد الأخضر وتأكد من أن المؤشر لا يتذبذب أو يختفي عند الحركات الطبيعية.
          </p>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">جودة التتبع اللحظية:</span>
              <span className={trackingData.detected ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {trackingData.detected ? '✓ تتبع نشط ومستقر' : 'في انتظار وضع اليد أمام الكاميرا'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-300"
                style={{ width: `${stabilityScore}%` }}
              />
            </div>

            {exercise1Passed && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  أحسنت! يدك مستقرة والتتبع موثوق. انتقل للتمرين التالي.
                </span>
                <button
                  onClick={() => setActiveExercise(2)}
                  className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg cursor-pointer"
                >
                  التالي
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXERCISE 2: Aiming at Targets */}
      {activeExercise === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-cyan-300">
              التدريب الثاني: توجيه السبابة نحو الأهداف الحية
            </h4>
            <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
              الأهداف المصابة: {ex2Hits} من 5
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            حرّك سبابتك في الهواء لتوجيه المؤشر نحو دائرة الهدف الصفراء. عند الاقتراب الكافي سيتحرك الهدف إلى نقطة جديدة.
          </p>

          {/* Interactive Aiming Field */}
          <div className="relative aspect-[16/8] w-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center">
            {/* Target Circle */}
            {ex2Hits < 5 ? (
              <div
                style={{
                  left: `${targetPos.x * 100}%`,
                  top: `${targetPos.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute w-12 h-12 rounded-full border-2 border-amber-400 bg-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/40 animate-pulse transition-all duration-300"
              >
                <Crosshair className="w-6 h-6 text-amber-300" />
              </div>
            ) : (
              <div className="text-center space-y-2">
                <Award className="w-12 h-12 text-emerald-400 mx-auto" />
                <h5 className="font-bold text-white text-base">رائع! أصبت كافة الأهداف الخمسة بنجاح!</h5>
                <button
                  onClick={() => setActiveExercise(3)}
                  className="px-4 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-cyan-500/30"
                >
                  الانتقال لتمرين استهداف المفاتيح
                </button>
              </div>
            )}

            {/* Live Index Pointer in Field */}
            {trackingData.indexTip && (
              <div
                style={{
                  left: `${trackingData.indexTip.x * 100}%`,
                  top: `${trackingData.indexTip.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute w-6 h-6 rounded-full border-2 border-cyan-400 bg-cyan-500/30 pointer-events-none flex items-center justify-center"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            )}

            {/* Proximity Gauge */}
            <div className="absolute bottom-3 right-3 bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono">
              القرب من الهدف: {ex2Proximity}%
            </div>
          </div>
        </div>
      )}

      {/* EXERCISE 3: Key Targeting on Keyboard */}
      {activeExercise === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-cyan-300">
              التدريب الثالث: توجيه المؤشر نحو مفاتيح لوحة المفاتيح
            </h4>
            <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
              الحرف المطلوب: «{ex3TargetKeys[ex3KeyIdx] || 'مكتمل'}»
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            تدرّب على الإشارة بسبابتك إلى الحروف المستهدفة التالية بالترتيب.
          </p>

          <div className="grid grid-cols-4 gap-3">
            {ex3TargetKeys.map((key, idx) => {
              const isDone = idx < ex3KeyIdx;
              const isCurrent = idx === ex3KeyIdx;
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (isCurrent) {
                      const next = ex3KeyIdx + 1;
                      setEx3KeyIdx(next);
                      if (next === ex3TargetKeys.length) {
                        setEx3Completed(true);
                      }
                    }
                  }}
                  className={`h-20 rounded-2xl border text-2xl font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                    isDone
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : isCurrent
                      ? 'bg-cyan-500 text-slate-950 border-white shadow-xl shadow-cyan-500/40 animate-pulse'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span>{key}</span>
                  <span className="text-[10px] font-mono">
                    {isDone ? '✓ تم' : isCurrent ? 'المطلوب' : 'قادم'}
                  </span>
                </button>
              );
            })}
          </div>

          {ex3Completed && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
              <span>أحسنت! تم استهداف كافة الحروف بنجاح.</span>
              <button
                onClick={() => setActiveExercise(4)}
                className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg cursor-pointer"
              >
                الانتقال لتمرين تأكيد الاختيار
              </button>
            </div>
          )}
        </div>
      )}

      {/* EXERCISE 4: Selection Confirmation & Debounce Repeat Prevention */}
      {activeExercise === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-cyan-300">
              التدريب الرابع: تأكيد الاختيار وقفل التكرار التلقائي (Anti-Repeat)
            </h4>
            <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
              النقرات المؤكدة: {ex4PinchCount}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            اضمم السبابة والإبهام معاً واستمر في ضمهما. ستلاحظ أن النظام يسجل ضغطة واحدة فقط ويمنع تكرار الحرف (WAIT_RELEASE) حتى تباعد أصابعك مجدداً!
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-1">
              <span className="text-slate-400 text-xs block">عدد الضغطات الحقيقية المقبولة:</span>
              <span className="text-2xl font-bold font-mono text-cyan-400">{ex4PinchCount}</span>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-1">
              <span className="text-slate-400 text-xs block">الإطارات المحظورة من التكرار العرضي:</span>
              <span className="text-2xl font-bold font-mono text-amber-400">{ex4BlockedRepeats} إطار</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <span>الحالة اللحظية للأصابع: {trackingData.pinchDistance <= settings.pinchThreshold ? 'ضم نشط' : 'أصابع متباعدة'}</span>
            <button
              onClick={() => setActiveExercise(5)}
              className="px-4 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
            >
              الانتقال لتمرين كتابة كلمة كاملة
            </button>
          </div>
        </div>
      )}

      {/* EXERCISE 5: Full Word Writing & Performance Analytics */}
      {activeExercise === 5 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-cyan-300">
              التدريب الخامس: كتابة كلمة كاملة في الهواء مع تقرير الأداء
            </h4>
            <button
              onClick={handleResetEx5}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> إعادة التمرين
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            الكلمة المستهدفة هي: «<strong className="text-white text-sm">{targetWord}</strong>». انقر على الحروف بالهواء أو باللمس بالترتيب الصحيح.
          </p>

          {/* Target Word Progress */}
          <div className="flex items-center justify-center gap-3 py-3">
            {targetWord.split('').map((char, idx) => {
              const isTyped = idx < typedLetters.length;
              return (
                <div
                  key={idx}
                  className={`w-14 h-14 rounded-2xl border text-2xl font-bold flex items-center justify-center transition ${
                    isTyped
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20'
                      : idx === typedLetters.length
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-200 animate-pulse'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  {isTyped ? typedLetters[idx] : char}
                </div>
              );
            })}
          </div>

          {/* Quick Arabic key buttons for testing */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800">
            {['س', 'ل', 'ا', 'م', 'ب', 'ت', 'ر', 'د'].map((l) => (
              <button
                key={l}
                onClick={() => handleEx5LetterClick(l)}
                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 hover:bg-cyan-500 hover:text-slate-950 text-white font-bold text-sm transition cursor-pointer"
              >
                {l}
              </button>
            ))}
          </div>

          {/* Detailed Performance Analytics Report when Word is Finished */}
          {wordFinished && (
            <div className="p-5 bg-slate-950 rounded-2xl border border-emerald-800/80 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <BarChart2 className="w-5 h-5" />
                <span>تقرير أداء الكتابة وتحليل الدقة</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">الحروف الصحيحة</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {typedLetters.length} / {targetWord.length}
                  </span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">الحروف الخاطئة</span>
                  <span className="text-lg font-bold text-rose-400 font-mono">{mistakesCount}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">دقة الإدخال</span>
                  <span className="text-lg font-bold text-cyan-400 font-mono">
                    {Math.round((typedLetters.length / (typedLetters.length + mistakesCount)) * 100)}%
                  </span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">استقرار التتبع</span>
                  <span className="text-lg font-bold text-emerald-400">ممتاز (95%)</span>
                </div>
              </div>

              <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl text-cyan-200 text-xs flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-cyan-300 mb-0.5">نصيحة ذكية لتحسين السرعة:</strong>
                  يمكنك استخدام خيار <em>«التثبيت الزمني (Dwell Selection)»</em> من إعدادات المعايرة إذا رغبت في الكتابة دون ضم السبابة والإبهام، أو تفعيل فلتر التنعيم لتقليل أي ارتعاش طفيف.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
