import React from 'react';
import { X, Moon, Sun, Monitor, Sparkles, Trash2, Check } from 'lucide-react';
import { AppSettings, ToneType } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onClearHistory: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  const toneOptions: { id: ToneType; label: string; desc: string }[] = [
    { id: 'default', label: 'Balanced (Default)', desc: 'Friendly, smart, and adaptive' },
    { id: 'casual', label: 'Casual & Warm', desc: 'Relaxed, conversational, like chatting with a friend' },
    { id: 'formal', label: 'Formal & Professional', desc: 'Executive tone, polished, structured' },
    { id: 'concise', label: 'Concise & Direct', desc: 'Short, straight to the point, minimal fluff' },
    { id: 'humorous', label: 'Fun & Playful', desc: 'Witty, upbeat with clever remarks' },
    { id: 'technical', label: 'Deep Technical', desc: 'In-depth engineering & scientific precision' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#16202b] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#24303e] flex items-center justify-center text-[#85dfc7]">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="font-semibold text-base">Clooney Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize appearance, behavior, and tone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Appearance / Theme */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 block">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Monitor },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onUpdateSettings({ ...settings, theme: id as any })}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-medium transition-all ${
                    settings.theme === id
                      ? 'border-[#85dfc7] bg-[#85dfc7]/10 text-slate-900 dark:text-[#85dfc7]'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Default Tone */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 block">
              Default Tone
            </label>
            <div className="space-y-2">
              {toneOptions.map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => onUpdateSettings({ ...settings, preferredTone: tone.id })}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    settings.preferredTone === tone.id
                      ? 'border-[#85dfc7] bg-[#85dfc7]/10 text-slate-900 dark:text-slate-100'
                      : 'border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">{tone.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{tone.desc}</div>
                  </div>
                  {settings.preferredTone === tone.id && (
                    <div className="w-5 h-5 rounded-full bg-[#85dfc7] flex items-center justify-center text-[#16202b] shrink-0">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Stream responses */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
            <div>
              <div className="text-sm font-semibold">Streaming Responses</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Stream Clooney&apos;s thoughts in real time word-by-word
              </div>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({ ...settings, streamResponses: !settings.streamResponses })
              }
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.streamResponses ? 'bg-[#85dfc7]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white dark:bg-[#16202b] shadow-sm transform transition-transform absolute top-0.5 ${
                  settings.streamResponses ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Clear history */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete all saved conversations? This cannot be undone.')) {
                  onClearHistory();
                  onClose();
                }
              }}
              className="flex items-center gap-2 text-red-500 hover:text-red-600 dark:hover:text-red-400 text-sm font-medium py-2 px-1 transition-colors"
            >
              <Trash2 size={16} />
              <span>Clear all chat history</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-[#131b24] border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#24303e] hover:bg-[#2e3d4e] text-white text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
