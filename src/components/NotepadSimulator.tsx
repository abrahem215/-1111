import React, { useState } from 'react';
import { Copy, Trash2, Download, FileText, Check, ShieldCheck } from 'lucide-react';

interface NotepadSimulatorProps {
  text: string;
  onClear: () => void;
  systemAdapterActive: boolean;
  onToggleSystemAdapter: () => void;
}

export const NotepadSimulator: React.FC<NotepadSimulatorProps> = ({
  text,
  onClear,
  systemAdapterActive,
  onToggleSystemAdapter,
}) => {
  const [copied, setCopied] = useState(false);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AirType_Output.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-full">
      {/* Title bar simulating external application */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-200">
            برنامج المفكرة (Windows Notepad / System Target Simulation)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* System SendInput Arm Toggle */}
          <button
            onClick={onToggleSystemAdapter}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold transition cursor-pointer ${
              systemAdapterActive
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="يحاكي تفعيل حقن SendInput في التطبيقات الخارجية"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {systemAdapterActive ? 'إرسال النظام: مفعّل (SendInput)' : 'إرسال النظام: متوقف'}
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            title="نسخ النص المكتوب"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            title="تنزيل كملف نصي"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClear}
            className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-950 transition cursor-pointer"
            title="مسح النص"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 p-4 bg-slate-950/70 font-mono text-base text-slate-100 overflow-y-auto min-h-[160px] whitespace-pre-wrap leading-relaxed select-text">
        {text ? (
          <span>
            {text}
            <span className="inline-block w-2 h-5 bg-cyan-400 ml-0.5 animate-pulse align-middle" />
          </span>
        ) : (
          <span className="text-slate-600 font-sans italic text-sm">
            ضع يدك أمام الكاميرا، وحرك السبابة لتحديد الحرف، ثم اضمم السبابة والإبهام للكتابة في الهواء دون لمس لوحة المفاتيح...
            <span className="inline-block w-2 h-4 bg-slate-600 ml-1 animate-pulse align-middle" />
          </span>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
        <div className="flex items-center gap-4">
          <span>الحروف: {charCount}</span>
          <span>الكلمات: {wordCount}</span>
          <span>الترميز: UTF-16 Unicode</span>
        </div>
        <div className="text-slate-500">
          {systemAdapterActive ? 'جاهز لحقن المفكرة' : 'الكتابة محلية في المعاينة'}
        </div>
      </div>
    </div>
  );
};
