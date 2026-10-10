/**
 * AirType AI — لوحة الكتابة في الهواء
 * Master Interactive Web Application & Companion Hub
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Layers,
  Code2,
  CheckCircle2,
  ShieldAlert,
  Sliders,
  Volume2,
  VolumeX,
  Globe,
  Monitor,
  Smartphone,
  Info,
  Terminal,
  Target,
  GraduationCap,
} from 'lucide-react';
import {
  Language,
  GestureState,
  KeyItem,
  EngineSettings,
  CalibrationProfile,
  HandTrackingData,
  SelectionMode,
} from './types';
import { ARABIC_LAYOUT, ENGLISH_LAYOUT } from './layouts';
import { LiveCameraView } from './components/LiveCameraView';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { NotepadSimulator } from './components/NotepadSimulator';
import { RepositoryExplorer } from './components/RepositoryExplorer';
import { TestRunnerView } from './components/TestRunnerView';
import { ArchitectureView } from './components/ArchitectureView';
import { HandCalibrationModal } from './components/HandCalibrationModal';
import { HandTrainingView } from './components/HandTrainingView';
import { ALL_PROJECT_FILES } from './projectFilesCatalog';
import { playKeyClickSound } from './audio';

export default function App() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'playground' | 'training' | 'repo' | 'tests' | 'architecture'>('playground');

  // Language state
  const [currentLang, setCurrentLang] = useState<Language>('ar');
  const [capsLock, setCapsLock] = useState<boolean>(false);

  // Engine state
  const [gestureState, setGestureState] = useState<GestureState>('IDLE');
  const [isEmergencyStopped, setIsEmergencyStopped] = useState<boolean>(false);
  const [systemAdapterActive, setSystemAdapterActive] = useState<boolean>(true);

  // Text buffer
  const [typedText, setTypedText] = useState<string>('مرحباً بكم في AirType AI — جرب الكتابة في الهواء وحركة الأصابع!');

  // Settings & Calibration
  const [settings, setSettings] = useState<EngineSettings>(() => {
    try {
      const saved = localStorage.getItem('airtype_calibration_profile');
      if (saved) {
        const p: CalibrationProfile = JSON.parse(saved);
        return {
          pinchThreshold: p.pinchThreshold ?? 0.055,
          smoothingAlpha: p.smoothingAlpha ?? 0.35,
          cooldownMs: p.cooldownMs ?? 300,
          soundEnabled: true,
          selectionMode: p.selectionMode ?? 'both',
          dwellTimeMs: p.dwellTimeMs ?? 700,
          mirrorCamera: p.mirrorCamera ?? true,
          showSkeleton: true,
          zoneXMin: p.zoneXMin ?? 0.15,
          zoneXMax: p.zoneXMax ?? 0.85,
          zoneYMin: p.zoneYMin ?? 0.20,
          zoneYMax: p.zoneYMax ?? 0.85,
        };
      }
    } catch {
      // Fallback
    }
    return {
      pinchThreshold: 0.055,
      smoothingAlpha: 0.35,
      cooldownMs: 300,
      soundEnabled: true,
      selectionMode: 'both',
      dwellTimeMs: 700,
      mirrorCamera: true,
      showSkeleton: true,
      zoneXMin: 0.15,
      zoneXMax: 0.85,
      zoneYMin: 0.20,
      zoneYMax: 0.85,
    };
  });

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showCalibrationModal, setShowCalibrationModal] = useState<boolean>(false);

  // Live tracking metrics
  const [liveTrackingData, setLiveTrackingData] = useState<HandTrackingData>({
    detected: false,
    landmarks: [],
    indexTip: null,
    thumbTip: null,
    wrist: null,
    pinchDistance: 1.0,
    isOpenPalm: false,
    handedness: 'Unknown',
    confidence: 0,
  });

  // Interaction feedback
  const [hoveredKeyId, setHoveredKeyId] = useState<string | null>(null);
  const [flashingKeyId, setFlashingKeyId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState<number>(0);

  // Gesture state machine internal timers
  const pinchStartRef = useRef<number | null>(null);
  const lastTriggerTimeRef = useRef<number>(0);
  const internalStateRef = useRef<GestureState>('IDLE');
  const cursorRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // Dwell timer references
  const dwellKeyRef = useRef<string | null>(null);
  const dwellStartRef = useRef<number | null>(null);

  const activeLayout = currentLang === 'ar' ? ARABIC_LAYOUT : ENGLISH_LAYOUT;

  // Execute key action
  const handleKeyExecution = useCallback(
    (key: KeyItem) => {
      // Visual flash
      setFlashingKeyId(key.id);
      setTimeout(() => setFlashingKeyId(null), 240);

      // Audio click feedback
      if (settings.soundEnabled) {
        playKeyClickSound();
      }

      if (key.value === 'BACKSPACE') {
        setTypedText((prev) => prev.slice(0, -1));
      } else if (key.value === 'SPACE') {
        setTypedText((prev) => prev + ' ');
      } else if (key.value === 'ENTER') {
        setTypedText((prev) => prev + '\n');
      } else if (key.value === 'SWITCH_LANG') {
        setCurrentLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
      } else if (key.value === 'CAPS_LOCK') {
        setCapsLock((prev) => !prev);
      } else {
        let charToAdd = key.value;
        if (currentLang === 'en' && key.type === 'char') {
          charToAdd = capsLock ? charToAdd.toUpperCase() : charToAdd.toLowerCase();
        }
        setTypedText((prev) => prev + charToAdd);
      }
    },
    [capsLock, currentLang, settings.soundEnabled]
  );

  // Coordinate hit testing against active layout keys
  const hitTestKey = useCallback(
    (normX: number, normY: number): KeyItem | null => {
      const rows = activeLayout.rows;
      if (rows.length === 0 || normX < 0 || normX > 1 || normY < 0 || normY > 1) {
        return null;
      }

      const rowIdx = Math.min(rows.length - 1, Math.max(0, Math.floor(normY * rows.length)));
      const row = rows[rowIdx];
      const totalWeights = row.keys.reduce((sum, k) => sum + k.width, 0);

      let accumulated = 0;
      for (const key of row.keys) {
        const keyWidthNorm = key.width / totalWeights;
        if (normX >= accumulated && normX <= accumulated + keyWidthNorm) {
          return key;
        }
        accumulated += keyWidthNorm;
      }
      return null;
    },
    [activeLayout.rows]
  );

  // Cursor move handler from camera / tracker
  const handleCursorMove = useCallback(
    (normX: number, normY: number) => {
      cursorRef.current = { x: normX, y: normY };
      if (isEmergencyStopped) {
        setHoveredKeyId(null);
        setDwellProgress(0);
        return;
      }

      const hitKey = hitTestKey(normX, normY);
      const hitKeyId = hitKey ? hitKey.id : null;
      setHoveredKeyId(hitKeyId);

      // Handle Dwell (Hover Hold) Selection Mode
      const now = performance.now();
      const allowDwell = settings.selectionMode === 'dwell' || settings.selectionMode === 'both';

      if (allowDwell && hitKey) {
        if (dwellKeyRef.current === hitKey.id) {
          const startTime = dwellStartRef.current || now;
          const elapsed = now - startTime;
          const progress = Math.min(1.0, elapsed / settings.dwellTimeMs);
          setDwellProgress(progress);

          if (progress >= 1.0 && now - lastTriggerTimeRef.current >= settings.cooldownMs) {
            // Dwell Confirmed!
            handleKeyExecution(hitKey);
            lastTriggerTimeRef.current = now;
            dwellStartRef.current = now + settings.cooldownMs; // Pause before refire
            setDwellProgress(0);
          }
        } else {
          // New key entered
          dwellKeyRef.current = hitKey.id;
          dwellStartRef.current = now;
          setDwellProgress(0);
        }
      } else {
        dwellKeyRef.current = null;
        dwellStartRef.current = null;
        setDwellProgress(0);
      }
    },
    [handleKeyExecution, hitTestKey, isEmergencyStopped, settings.cooldownMs, settings.dwellTimeMs, settings.selectionMode]
  );

  // Pinch distance & state machine evaluator
  const handlePinchState = useCallback(
    (isPinching: boolean, pinchDistance: number) => {
      if (isEmergencyStopped) {
        internalStateRef.current = 'EMERGENCY_STOPPED';
        setGestureState('EMERGENCY_STOPPED');
        return;
      }

      const allowPinch = settings.selectionMode === 'pinch' || settings.selectionMode === 'both';
      if (!allowPinch) return;

      const now = performance.now();
      const currState = internalStateRef.current;

      if (currState === 'WAIT_RELEASE') {
        // Must separate fingers past threshold to reset and allow next click
        if (!isPinching || pinchDistance >= settings.pinchThreshold + 0.03) {
          internalStateRef.current = 'IDLE';
          setGestureState('IDLE');
          pinchStartRef.current = null;
        }
        return;
      }

      if (isPinching || pinchDistance <= settings.pinchThreshold) {
        if (currState === 'IDLE' || currState === 'NO_HAND') {
          // Check cooldown
          if (now - lastTriggerTimeRef.current >= settings.cooldownMs) {
            internalStateRef.current = 'PINCH_POTENTIAL';
            setGestureState('PINCH_POTENTIAL');
            pinchStartRef.current = now;
          }
        } else if (currState === 'PINCH_POTENTIAL') {
          const holdDuration = now - (pinchStartRef.current || now);
          if (holdDuration >= 100) {
            // CONFIRMED PINCH! Trigger action ONCE!
            internalStateRef.current = 'TRIGGERED';
            setGestureState('TRIGGERED');
            lastTriggerTimeRef.current = now;

            // Find hovered key and execute
            const hit = hitTestKey(cursorRef.current.x, cursorRef.current.y);
            if (hit) {
              handleKeyExecution(hit);
            }

            // Immediately enter WAIT_RELEASE to lock out repeats!
            internalStateRef.current = 'WAIT_RELEASE';
            setGestureState('WAIT_RELEASE');
          }
        }
      } else {
        if (currState === 'PINCH_POTENTIAL') {
          internalStateRef.current = 'IDLE';
          setGestureState('IDLE');
          pinchStartRef.current = null;
        }
      }
    },
    [handleKeyExecution, hitTestKey, isEmergencyStopped, settings.cooldownMs, settings.pinchThreshold, settings.selectionMode]
  );

  const handleOpenPalm = useCallback(
    (isOpenPalm: boolean) => {
      if (isEmergencyStopped) return;
      if (isOpenPalm) {
        internalStateRef.current = 'PALM_PAUSED';
        setGestureState('PALM_PAUSED');
        pinchStartRef.current = null;
        dwellStartRef.current = null;
        setDwellProgress(0);
      } else if (internalStateRef.current === 'PALM_PAUSED') {
        internalStateRef.current = 'IDLE';
        setGestureState('IDLE');
      }
    },
    [isEmergencyStopped]
  );

  // Apply calibrated profile
  const handleApplyCalibrationProfile = (profile: CalibrationProfile) => {
    setSettings((prev) => ({
      ...prev,
      zoneXMin: profile.zoneXMin,
      zoneXMax: profile.zoneXMax,
      zoneYMin: profile.zoneYMin,
      zoneYMax: profile.zoneYMax,
      pinchThreshold: profile.pinchThreshold,
      dwellTimeMs: profile.dwellTimeMs,
      selectionMode: profile.selectionMode,
      mirrorCamera: profile.mirrorCamera,
      smoothingAlpha: profile.smoothingAlpha,
      cooldownMs: profile.cooldownMs,
    }));
  };

  // Emergency stop toggle
  const triggerEmergencyStop = useCallback(() => {
    setIsEmergencyStopped(true);
    internalStateRef.current = 'EMERGENCY_STOPPED';
    setGestureState('EMERGENCY_STOPPED');
    setHoveredKeyId(null);
    setDwellProgress(0);
  }, []);

  const resetEmergencyStop = useCallback(() => {
    setIsEmergencyStopped(false);
    internalStateRef.current = 'IDLE';
    setGestureState('IDLE');
  }, []);

  // Global F12 shortcut listener for Emergency Stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        triggerEmergencyStop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerEmergencyStop]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/25">
            <span className="text-xl">A</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                AirType AI
              </h1>
              <span className="text-xs text-cyan-400 font-bold bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800/80">
                لوحة الكتابة في الهواء
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              اكتب في الهواء، ودع كلماتك تظهر على الشاشة.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('playground')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'playground'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>لوحة الكتابة الحية</span>
          </button>

          <button
            onClick={() => setActiveTab('training')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'training'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>وضع التدريب 🎓</span>
          </button>

          <button
            onClick={() => setActiveTab('repo')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'repo'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>مستودع الكود</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tests'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>الاختبارات</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>التصميم المعماري</span>
          </button>
        </nav>

        {/* Quick Controls */}
        <div className="flex items-center gap-2">
          {/* Hand Calibration Button */}
          <button
            onClick={() => setShowCalibrationModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-700/80 hover:bg-cyan-900 transition text-xs font-bold cursor-pointer"
            title="معايرة منطقة حركة اليد وحساسية الإيماءات"
          >
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">معايرة اليد</span>
          </button>

          {isEmergencyStopped ? (
            <button
              onClick={resetEmergencyStop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 cursor-pointer animate-pulse"
            >
              <CheckCircle2 className="w-4 h-4" />
              استئناف العمل
            </button>
          ) : (
            <button
              onClick={triggerEmergencyStop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30 cursor-pointer"
              title="إيقاف فوري لكافة المدخلات (مفتاح F12)"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>🛑 إيقاف فوري (F12)</span>
            </button>
          )}

          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            title="إعدادات الحساسية والتنعيم"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* TAB 1: Live Air-Typing Playground */}
        {activeTab === 'playground' && (
          <div className="flex flex-col gap-6">
            {/* Top Row: Camera Tracking on Left, Simulated Notepad on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 flex flex-col">
                <LiveCameraView
                  onCursorMove={handleCursorMove}
                  onPinchState={handlePinchState}
                  onOpenPalm={handleOpenPalm}
                  onTrackingData={setLiveTrackingData}
                  onOpenCalibration={() => setShowCalibrationModal(true)}
                  gestureState={gestureState}
                  isEmergencyStopped={isEmergencyStopped}
                  settings={settings}
                />
              </div>

              <div className="lg:col-span-5 flex flex-col">
                <NotepadSimulator
                  text={typedText}
                  onClear={() => setTypedText('')}
                  systemAdapterActive={systemAdapterActive}
                  onToggleSystemAdapter={() => setSystemAdapterActive(!systemAdapterActive)}
                />
              </div>
            </div>

            {/* Gesture State Transition Banner */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">طريقة الاختيار الحالية:</span>
                <span className="bg-cyan-950 text-cyan-300 font-bold px-2 py-0.5 rounded border border-cyan-800">
                  {settings.selectionMode === 'pinch'
                    ? 'ضم السبابة والإبهام (Pinch)'
                    : settings.selectionMode === 'dwell'
                    ? `التثبيت الزمني (${settings.dwellTimeMs}ms Dwell)`
                    : `الضم والتثبيت معاً (${settings.dwellTimeMs}ms)`}
                </span>

                <span className="text-slate-400 font-bold mr-2">حالة المحرك:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold ${
                    gestureState === 'TRIGGERED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : gestureState === 'WAIT_RELEASE'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : gestureState === 'PINCH_POTENTIAL'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : gestureState === 'PALM_PAUSED'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : gestureState === 'EMERGENCY_STOPPED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {gestureState}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentLang(currentLang === 'ar' ? 'en' : 'ar')}
                  className="flex items-center gap-1.5 text-cyan-400 font-bold hover:underline cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{currentLang === 'ar' ? 'التبديل إلى English' : 'التبديل إلى العربية'}</span>
                </button>

                <button
                  onClick={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                  className="text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  title="تبديل صوت النقرة"
                >
                  {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Bottom Row: Full Virtual Keyboard */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs px-2 text-slate-400">
                <span className="font-bold text-slate-300">
                  لوحة المفاتيح الافتراضية ({activeLayout.name})
                </span>
                <span>
                  {hoveredKeyId ? (
                    <span className="text-cyan-400 font-bold">
                      الحرف المستهدف: {hoveredKeyId}
                      {dwellProgress > 0 && ` (جاري التثبيت: ${Math.round(dwellProgress * 100)}%)`}
                    </span>
                  ) : (
                    'وجه السبابة فوق الحرف المطلوب'
                  )}
                </span>
              </div>

              <VirtualKeyboard
                layout={activeLayout}
                hoveredKeyId={hoveredKeyId}
                flashingKeyId={flashingKeyId}
                onKeyClick={handleKeyExecution}
                capsLock={capsLock}
                dwellProgress={dwellProgress}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Hand Training Mode */}
        {activeTab === 'training' && (
          <HandTrainingView trackingData={liveTrackingData} settings={settings} />
        )}

        {/* TAB 3: Repository Explorer */}
        {activeTab === 'repo' && (
          <RepositoryExplorer files={ALL_PROJECT_FILES} />
        )}

        {/* TAB 4: Unit Test Runner */}
        {activeTab === 'tests' && (
          <TestRunnerView />
        )}

        {/* TAB 5: Architecture View */}
        {activeTab === 'architecture' && (
          <ArchitectureView />
        )}
      </main>

      {/* Hand Calibration Modal */}
      <HandCalibrationModal
        isOpen={showCalibrationModal}
        onClose={() => setShowCalibrationModal(false)}
        trackingData={liveTrackingData}
        cameraActive={true}
        onApplyProfile={handleApplyCalibrationProfile}
        currentProfile={{
          zoneXMin: settings.zoneXMin,
          zoneXMax: settings.zoneXMax,
          zoneYMin: settings.zoneYMin,
          zoneYMax: settings.zoneYMax,
          pinchThreshold: settings.pinchThreshold,
          dwellTimeMs: settings.dwellTimeMs,
          selectionMode: settings.selectionMode,
          mirrorCamera: settings.mirrorCamera,
          smoothingAlpha: settings.smoothingAlpha,
          cooldownMs: settings.cooldownMs,
        }}
      />

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base">
                إعدادات محرك AirType AI
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Selection Mode Toggle */}
              <div>
                <span className="text-slate-300 font-bold block mb-1.5">طريقة تأكيد الحرف:</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'pinch', label: 'ضم الأصابع' },
                    { id: 'dwell', label: 'التثبيت الزمني' },
                    { id: 'both', label: 'كلاهما معاً' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSettings({ ...settings, selectionMode: m.id as SelectionMode })}
                      className={`py-1.5 rounded-lg font-bold border transition cursor-pointer text-center ${
                        settings.selectionMode === m.id
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dwell time */}
              {(settings.selectionMode === 'dwell' || settings.selectionMode === 'both') && (
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>مدة التثبيت فوق الحرف (Dwell Time):</span>
                    <span className="font-mono text-cyan-400 font-bold">{settings.dwellTimeMs} ms</span>
                  </div>
                  <input
                    type="range"
                    min="400"
                    max="1500"
                    step="50"
                    value={settings.dwellTimeMs}
                    onChange={(e) => setSettings({ ...settings, dwellTimeMs: parseInt(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              )}

              {/* Pinch threshold */}
              {(settings.selectionMode === 'pinch' || settings.selectionMode === 'both') && (
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>عتبة مسافة ضم الأصابع (Pinch Threshold):</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {settings.pinchThreshold.toFixed(3)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.10"
                    step="0.005"
                    value={settings.pinchThreshold}
                    onChange={(e) =>
                      setSettings({ ...settings, pinchThreshold: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              )}

              {/* Smoothing alpha */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>معامل تنعيم المؤشر (Anti-Jitter EMA Alpha):</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {settings.smoothingAlpha.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={settings.smoothingAlpha}
                  onChange={(e) =>
                    setSettings({ ...settings, smoothingAlpha: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Cooldown */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>مهلة منع التكرار بين الحروف (Cooldown):</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {settings.cooldownMs} ms
                  </span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="800"
                  step="25"
                  value={settings.cooldownMs}
                  onChange={(e) =>
                    setSettings({ ...settings, cooldownMs: parseInt(e.target.value) })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Mirror Camera & Skeleton Toggles */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-300">عكس صورة الكاميرا (Mirroring):</span>
                <button
                  onClick={() => setSettings({ ...settings, mirrorCamera: !settings.mirrorCamera })}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    settings.mirrorCamera ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.mirrorCamera ? 'مفعّل' : 'معطّل'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">إظهار هيكل نقاط اليد (Skeleton):</span>
                <button
                  onClick={() => setSettings({ ...settings, showSkeleton: !settings.showSkeleton })}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    settings.showSkeleton ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.showSkeleton ? 'مفعّل' : 'معطّل'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">صوت نقرة المفتاح:</span>
                <button
                  onClick={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    settings.soundEnabled ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.soundEnabled ? 'مفعّل' : 'معطّل'}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              حفظ وإغلاق
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>AirType AI — كيبورد ذكي للكتابة في الهواء</span>
          <span className="text-slate-700">•</span>
          <span className="text-emerald-400 font-bold">معالجة محلية 100% دون إنترنت</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400">Windows (SendInput) & Android (InputMethodService)</span>
        </div>
      </footer>
    </div>
  );
}
