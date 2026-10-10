import React from 'react';
import { Layers, Cpu, Shield, Smartphone, Monitor, Lock, Workflow, CheckCircle } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-2xl flex flex-col gap-6">
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <Layers className="w-6 h-6 text-cyan-400" />
        <div>
          <h3 className="font-bold text-slate-100 text-lg">
            التصميم المعماري وتدفق الإشارات في AirType AI
          </h3>
          <p className="text-xs text-slate-400">
            مقارنة بين مسار معالجة الإشارات على أجهزة الكمبيوتر (Windows) وهواتف أندرويد
          </p>
        </div>
      </div>

      {/* Two Pipeline Cards: Windows vs Android */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Windows Architecture */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
            <Monitor className="w-5 h-5" />
            <span>بنية تطبيق الكمبيوتر (Windows Architecture)</span>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
              <span className="font-bold text-cyan-300 block mb-1">1. الالتقاط والتوازي (Threading)</span>
              فصل خيط الكاميرا (OpenCV VideoCapture) عن واجهة PySide6 عبر QThread لمنع أي تجميد أثناء المعالجة بمعدل 30-60 إطار في الثانية.
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
              <span className="font-bold text-cyan-300 block mb-1">2. محرك الرؤية وتتبع اليد</span>
              استخدام MediaPipe Hands لاستخراج 21 معلم ثلاثي الأبعاد، مع عكس المحور الأفقي (Mirroring) لضمان حركة متوافقة مع اليد في الواقع.
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
              <span className="font-bold text-cyan-300 block mb-1">3. فلتر التنعيم وآلة الحالات</span>
              فلتر EMA يخمد الاهتزازات الصغيرة (Jitter)، وآلة الحالات تلزم المستخدم بـ 100ms ثبات قبل إطلاق الحرف، مع قفل WAIT_RELEASE لمنع تكرار الحرف أثناء الضم.
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
              <span className="font-bold text-emerald-400 block mb-1">4. حقن النظام عبر Windows SendInput</span>
              حقن نصوص Unicode مباشرة عبر ctypes (KEYEVENTF_UNICODE) دون سرقة تركيز النافذة، مما يسمح بالكتابة الحرة في المفكرة وWord والمتصفحات.
            </div>
          </div>
        </div>

        {/* Android Architecture */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
            <Smartphone className="w-5 h-5" />
            <span>بنية تطبيق أندرويد (Android InputMethodService)</span>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
              <span className="font-bold text-emerald-300 block mb-1">1. لوحة مفاتيح نظامية حقيقية</span>
              وراثة خدمة AirTypeIME من فئة InputMethodService، وتسجيلها في AndroidManifest مع Subtypes للغتين العربية والإنجليزية.
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
              <span className="font-bold text-emerald-300 block mb-1">2. دورة حياة الكاميرا مع CameraX</span>
              إدارة ImageAnalysis بالارتباط بدورة حياة InputView (onStartInputView / onFinishInputView) لإيقاف الكاميرا فورياً وتوفير البطارية عند إغلاق الكيبورد.
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
              <span className="font-bold text-emerald-300 block mb-1">3. واجهة Jetpack Compose الحديثة</span>
              رسم واجهة الكيبورد بـ ComposeView مع دعم كامل للوضع البديل باللمس (Touch Fallback) لمنع أي انقطاع في تجربة المستخدم.
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80">
              <span className="font-bold text-cyan-300 block mb-1">4. الإدخال المباشر عبر InputConnection</span>
              تمرير النصوص العربية والإنجليزية عبر currentInputConnection.commitText() مع التعامل الدقيق مع الحذف والانتقال لسطر جديد.
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Guarantees */}
      <div className="bg-emerald-950/30 border border-emerald-800/60 p-4 rounded-xl flex items-start gap-3">
        <Shield className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <h4 className="font-bold text-emerald-300 text-sm mb-1">
            ضمانات الخصوصية والتشغيل المحلي بنسبة 100%
          </h4>
          <p className="text-emerald-200/80 leading-relaxed">
            يعمل كيبورد AirType AI بالكامل داخل ذاكرة جهازك المحلية دون إرسال أي صورة أو فيديو أو نص مكتوب إلى أي سيرفر خارجي. لا يحتوي التطبيق على أي نماذج ذكاء اصطناعي توليدي سحابية أو واجهات برمجة مدفوعة، بل يعتمد حصرياً على خوارزميات الرؤية الحاسوبية ومعالجة الإشارات المحلية.
          </p>
        </div>
      </div>
    </div>
  );
};
