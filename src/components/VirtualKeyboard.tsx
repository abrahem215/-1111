import React from 'react';
import { KeyboardLayoutData, KeyItem } from '../types';
import { Globe, ArrowDownLeft, Delete, Space } from 'lucide-react';

interface VirtualKeyboardProps {
  layout: KeyboardLayoutData;
  hoveredKeyId: string | null;
  flashingKeyId: string | null;
  onKeyClick: (key: KeyItem) => void;
  capsLock: boolean;
  dwellProgress?: number; // 0.0 to 1.0
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  layout,
  hoveredKeyId,
  flashingKeyId,
  onKeyClick,
  capsLock,
  dwellProgress = 0,
}) => {
  return (
    <div
      dir={layout.direction}
      className="bg-slate-950 p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col gap-2 select-none"
    >
      {layout.rows.map((row) => (
        <div key={row.rowId} className="flex gap-1.5 sm:gap-2 w-full">
          {row.keys.map((key) => {
            const isHovered = hoveredKeyId === key.id;
            const isFlashing = flashingKeyId === key.id;

            let displayLabel = key.label;
            if (layout.language === 'en' && key.type === 'char') {
              displayLabel = capsLock ? key.label.toUpperCase() : key.label.toLowerCase();
            }

            // Key Styling
            let bgClass = 'bg-slate-900 text-slate-100 border-slate-800';
            if (isFlashing) {
              bgClass = 'bg-emerald-500 text-slate-950 border-emerald-300 scale-95 shadow-lg shadow-emerald-500/50';
            } else if (isHovered) {
              bgClass = 'bg-cyan-500 text-white border-cyan-300 scale-105 shadow-xl shadow-cyan-500/40 ring-2 ring-cyan-400 z-10';
            } else if (key.type === 'action') {
              bgClass = 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-750';
            } else {
              bgClass = 'bg-slate-900/90 text-slate-100 border-slate-800 hover:border-slate-700 hover:bg-slate-850';
            }

            return (
              <button
                key={key.id}
                onClick={() => onKeyClick(key)}
                style={{ flexGrow: key.width, flexBasis: `${key.width * 28}px` }}
                className={`relative h-11 sm:h-13 rounded-xl border font-bold text-sm sm:text-base flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer overflow-hidden ${bgClass}`}
                title={key.label}
              >
                {/* Dwell Progress filling bar on bottom */}
                {isHovered && dwellProgress > 0 && (
                  <span
                    style={{ width: `${Math.min(100, Math.round(dwellProgress * 100))}%` }}
                    className="absolute bottom-0 left-0 h-1.5 bg-emerald-300 transition-all duration-75 shadow-sm shadow-emerald-400"
                  />
                )}

                {key.value === 'SWITCH_LANG' ? (
                  <span className="flex items-center gap-1 text-cyan-400 font-bold text-xs sm:text-sm">
                    <Globe className="w-4 h-4" />
                    {displayLabel}
                  </span>
                ) : key.value === 'BACKSPACE' ? (
                  <span className="flex items-center gap-1 text-rose-300 text-xs sm:text-sm">
                    <Delete className="w-4 h-4" />
                    {displayLabel}
                  </span>
                ) : key.value === 'SPACE' ? (
                  <span className="flex items-center gap-1 text-slate-300 text-xs sm:text-sm">
                    <Space className="w-4 h-4" />
                    {displayLabel}
                  </span>
                ) : key.value === 'ENTER' ? (
                  <span className="flex items-center gap-1 text-emerald-300 text-xs sm:text-sm">
                    <ArrowDownLeft className="w-4 h-4" />
                    {displayLabel}
                  </span>
                ) : (
                  <span>{displayLabel}</span>
                )}

                {/* Laser hover indicator dot */}
                {isHovered && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-300 rounded-full animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
