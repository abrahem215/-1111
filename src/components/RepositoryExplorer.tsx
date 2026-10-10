import React, { useState } from 'react';
import { FolderTree, FileCode, Copy, Check, Download, Search, Terminal } from 'lucide-react';
import { ProjectFile } from '../types';

interface RepositoryExplorerProps {
  files: ProjectFile[];
}

export const RepositoryExplorer: React.FC<RepositoryExplorerProps> = ({ files }) => {
  const [selectedFile, setSelectedFile] = useState<ProjectFile>(files[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copied, setCopied] = useState<boolean>(false);

  const categories = [
    { id: 'all', label: 'جميع الملفات' },
    { id: 'desktop', label: 'نسخة الكمبيوتر (Python / PySide6)' },
    { id: 'android', label: 'نسخة أندرويد (Kotlin / Compose)' },
    { id: 'shared', label: 'التخطيطات المشتركة (JSON)' },
    { id: 'docs', label: 'الأدلة والمواصفات (Docs)' },
  ];

  const filteredFiles = files.filter((f) => {
    const matchCat = activeCategory === 'all' || f.category === activeCategory;
    const matchSearch = f.path.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectedFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.path.split('/').pop() || 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-full">
      {/* Category selector & search bar */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeCategory === c.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث في أسماء الملفات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Main Split Layout: Left File List, Right Code View */}
      <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-[500px]">
        {/* File List Column */}
        <div className="md:col-span-4 border-l border-slate-800 bg-slate-950/60 overflow-y-auto max-h-[550px]">
          <div className="p-2 space-y-1">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-right px-3 py-2.5 rounded-xl text-xs font-mono flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-800/80 font-bold'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="truncate">{file.path}</span>
                  </div>
                  <span className="text-[10px] uppercase text-slate-500 px-1.5 py-0.5 rounded bg-slate-900">
                    {file.language}
                  </span>
                </button>
              );
            })}

            {filteredFiles.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                لا توجد ملفات مطابقة للبحث
              </div>
            )}
          </div>
        </div>

        {/* Code Content View Column */}
        <div className="md:col-span-8 flex flex-col bg-slate-950">
          {/* File Header */}
          <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-mono text-cyan-300">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>{selectedFile.path}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'تم النسخ' : 'نسخ الكود'}
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                تحميل الملف
              </button>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 p-4 overflow-auto max-h-[500px] font-mono text-xs text-slate-300 leading-relaxed bg-slate-950/90 select-text">
            <pre dir="ltr" className="whitespace-pre">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
