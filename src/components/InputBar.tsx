import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Paperclip,
  Image as ImageIcon,
  X,
  Sparkles,
  SlidersHorizontal,
  FileText,
  FileCode,
  File as FileGeneric,
  Mic,
  MicOff,
  Volume2,
  AlertCircle,
  Square,
} from 'lucide-react';
import { Attachment, ToneType } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface InputBarProps {
  onSendMessage: (content: string, attachments: Attachment[], tone?: ToneType) => void;
  isLoading: boolean;
  onStopGeneration?: () => void;
  currentTone: ToneType;
  onChangeTone: (tone: ToneType) => void;
  suggestedInput?: string;
  onClearSuggestedInput?: () => void;
  speechRecognition?: ReturnType<typeof useSpeechRecognition>;
}

export const InputBar: React.FC<InputBarProps> = ({
  onSendMessage,
  isLoading,
  onStopGeneration,
  currentTone,
  onChangeTone,
  suggestedInput,
  onClearSuggestedInput,
  speechRecognition,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fallback if not directly provided by ChatArea component
  const localSpeech = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    autoDetectLanguage: true,
    onTranscriptUpdate: (newText) => {
      setInputText(newText);
      textareaRef.current?.focus();
    },
  });

  const activeSpeech = speechRecognition || localSpeech;

  // Web Speech API with continuous mode, interimResults: true, and language auto-detection
  const {
    isSupported: isSpeechSupported,
    isListening,
    isTranscribing,
    volumeLevel,
    interimTranscript,
    detectedLanguage,
    error: speechError,
    toggleListening,
    stopListening,
    clearError: clearSpeechError,
  } = activeSpeech;

  // Sync suggested input if provided externally (e.g. prompt chips, voice, or refine clicks)
  useEffect(() => {
    if (suggestedInput !== undefined && suggestedInput !== '') {
      setInputText(suggestedInput);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [suggestedInput]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [inputText, interimTranscript]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isListening) {
      stopListening();
    }

    const trimmed = (inputText + (interimTranscript ? ` ${interimTranscript}` : '')).trim();
    if ((!trimmed && attachments.length === 0) || isLoading) return;

    onSendMessage(trimmed, attachments, currentTone);
    setInputText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Handle file uploads
  const handleFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = 'att_' + Date.now() + '_' + i;

      // Read as base64 for images and PDFs
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        const dataUrl = await readFileAsDataUrl(file);
        newAttachments.push({
          id,
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl,
        });
      } else {
        // Read as text for code, csv, markdown, txt, json
        const textContent = await readFileAsText(file);
        newAttachments.push({
          id,
          name: file.name,
          type: file.type || 'text/plain',
          size: file.size,
          content: textContent,
        });
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Drag and drop support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  const toneLabels: Record<ToneType, string> = {
    default: 'Default',
    casual: 'Casual',
    formal: 'Formal',
    concise: 'Concise',
    humorous: 'Witty',
    technical: 'Technical',
    creative: 'Creative',
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 sm:pb-6 pt-2">
      {/* Speech recognition error notification if any */}
      {speechError && (
        <div className="mb-2.5 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{speechError}</span>
          </div>
          <button
            type="button"
            onClick={clearSpeechError}
            className="p-1 hover:bg-red-500/20 rounded-md transition-colors"
            title="Dismiss error"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Container with rounded pill style */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-3xl transition-all duration-200 border shadow-lg overflow-hidden ${
          isListening
            ? 'border-[#85dfc7] ring-2 ring-[#85dfc7]/30 bg-white dark:bg-[#1c2633]'
            : isDragOver
            ? 'border-[#85dfc7] bg-[#85dfc7]/10'
            : 'bg-white dark:bg-[#1c2633] border-slate-200/90 dark:border-[#2e3e52]'
        }`}
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileChange(e.target.files)}
          multiple
          className="hidden"
          accept="image/*,application/pdf,text/*,.csv,.json,.ts,.js,.py,.html,.css"
        />

        {/* Transcribing state indicator */}
        {isTranscribing && (
          <div className="px-4 py-2 bg-[#85dfc7]/15 dark:bg-[#85dfc7]/20 border-b border-[#85dfc7]/30 flex items-center gap-2.5 animate-in fade-in duration-200">
            <Sparkles size={14} className="text-[#85dfc7] animate-spin" />
            <span className="text-xs font-semibold text-[#134e48] dark:text-[#85dfc7]">
              Refining with AI speech clarity...
            </span>
          </div>
        )}

        {/* Live Audio Reactive Soundwave & Transcript Banner */}
        {isListening && (
          <div className="px-4 py-2 bg-[#85dfc7]/15 dark:bg-[#85dfc7]/20 border-b border-[#85dfc7]/30 flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Dynamic Soundwave bars reacting to actual microphone volume */}
              <div className="flex items-center gap-1 h-5 px-1 shrink-0">
                <span
                  className="w-1 bg-[#85dfc7] rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(6, volumeLevel * 20)}px` }}
                />
                <span
                  className="w-1 bg-[#85dfc7] rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(8, volumeLevel * 26)}px` }}
                />
                <span
                  className="w-1 bg-[#85dfc7] rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(7, volumeLevel * 22)}px` }}
                />
                <span
                  className="w-1 bg-[#85dfc7] rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(5, volumeLevel * 16)}px` }}
                />
              </div>
              <span className="text-xs font-semibold text-[#134e48] dark:text-[#85dfc7] shrink-0 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#85dfc7] animate-ping" />
                <span>Listening</span>
                <span className="px-1.5 py-0.5 rounded-md bg-[#85dfc7]/20 text-[10px] font-mono uppercase text-[#134e48] dark:text-[#85dfc7] font-bold" title="Auto-detected language">
                  {detectedLanguage || 'Auto'}
                </span>
              </span>
              {interimTranscript ? (
                <span className="text-xs italic text-slate-700 dark:text-slate-200 truncate">
                  &ldquo;{interimTranscript}&rdquo;
                </span>
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                  Speak clearly into your microphone
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="px-2.5 py-1 rounded-lg bg-[#85dfc7] hover:bg-[#9de6d3] text-[#16202b] font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Done speaking"
            >
              <Square size={10} fill="currentColor" />
              <span>Done</span>
            </button>
          </div>
        )}

        {/* Attachment preview chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 pb-0">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#253344] border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 group"
              >
                {att.type.startsWith('image/') && att.dataUrl ? (
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="w-6 h-6 rounded object-cover"
                  />
                ) : (
                  <FileText size={15} className="text-[#85dfc7]" />
                )}
                <span className="max-w-[130px] truncate font-medium">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="p-0.5 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main Input Textarea */}
        <div className="px-4 pt-3 pb-2 flex flex-col">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Listening to your voice... Speak now'
                : 'Ask Clooney anything (math, code, writing, image ideas)...'
            }
            className="w-full bg-transparent resize-none text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm sm:text-base focus:outline-none max-h-44 leading-relaxed"
          />
          {/* Subtle live interim transcription inline preview if user is speaking */}
          {isListening && interimTranscript && (
            <div className="text-xs text-[#85dfc7] italic pt-1 truncate">
              {interimTranscript}...
            </div>
          )}
        </div>

        {/* Bottom toolbar */}
        <div className="px-3 pb-2.5 pt-1 flex items-center justify-between border-t border-slate-100 dark:border-[#273648]">
          {/* Left Actions: Attach, Voice dictation (Mic), Image shortcut, Tone picker */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-slate-500 dark:text-slate-400">
            {/* Attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#28384a] hover:text-[#85dfc7] transition-colors relative"
              title="Attach files or images"
            >
              <Paperclip size={18} />
            </button>

            {/* Voice Dictation (Microphone) with Web Speech API */}
            <div className="relative">
              <button
                type="button"
                onClick={toggleListening}
                disabled={!isSpeechSupported}
                className={`p-2 rounded-full transition-all duration-200 relative flex items-center justify-center ${
                  isListening
                    ? 'bg-[#85dfc7] text-[#16202b] shadow-md ring-2 ring-[#85dfc7]/50 scale-105'
                    : isSpeechSupported
                    ? 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#28384a] hover:text-[#85dfc7]'
                    : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                }`}
                title={
                  !isSpeechSupported
                    ? 'Speech recognition is not supported in this browser (Chrome, Edge, or Safari recommended)'
                    : isListening
                    ? 'Listening... Click to stop speaking'
                    : 'Speak your prompt to Clooney (voice input)'
                }
                aria-label="Microphone speech input"
              >
                {isListening ? (
                  <>
                    <span className="absolute -inset-1 rounded-full bg-[#85dfc7]/40 animate-ping pointer-events-none" />
                    <Mic size={18} className="relative z-10 animate-pulse text-[#16202b]" />
                  </>
                ) : isSpeechSupported ? (
                  <Mic size={18} />
                ) : (
                  <MicOff size={18} />
                )}
              </button>
            </div>

            {/* Prompt for Image shortcut */}
            <button
              type="button"
              onClick={() => {
                if (!inputText.toLowerCase().startsWith('generate an image of')) {
                  setInputText('Generate an image of ' + inputText.replace(/^generate an image of\s*/i, ''));
                }
                textareaRef.current?.focus();
              }}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#28384a] hover:text-[#85dfc7] transition-colors hidden sm:flex items-center gap-1 text-xs"
              title="Create an image"
            >
              <ImageIcon size={18} />
            </button>

            {/* Tone Selector Dropdown / Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowToneMenu(!showToneMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-[#243242] hover:bg-slate-200 dark:hover:bg-[#2d3d50] text-slate-700 dark:text-slate-300 transition-colors"
                title="Change tone"
              >
                <SlidersHorizontal size={13} className="text-[#85dfc7]" />
                <span>{toneLabels[currentTone]}</span>
              </button>

              {/* Tone Menu Popup */}
              {showToneMenu && (
                <div className="absolute left-0 bottom-full mb-2 w-48 bg-white dark:bg-[#16202b] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 z-30 space-y-0.5">
                  {(['default', 'casual', 'formal', 'concise', 'humorous', 'technical', 'creative'] as ToneType[]).map(
                    (t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          onChangeTone(t);
                          setShowToneMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                          currentTone === t
                            ? 'bg-[#85dfc7]/15 text-[#134e48] dark:text-[#85dfc7]'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{toneLabels[t]}</span>
                        {currentTone === t && <span className="w-1.5 h-1.5 rounded-full bg-[#85dfc7]" />}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Action: Send Button in Cloud Mint */}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="px-3 py-2 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors"
                title="Stop response"
              >
                <span className="w-2.5 h-2.5 rounded-xs bg-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!inputText.trim() && attachments.length === 0}
                className={`p-2.5 rounded-full font-semibold transition-all duration-200 shadow-sm flex items-center justify-center active:scale-95 ${
                  inputText.trim() || attachments.length > 0
                    ? 'bg-[#85dfc7] hover:bg-[#9de6d3] text-[#16202b] cursor-pointer'
                    : 'bg-slate-200 dark:bg-[#253344] text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
                title="Send message (Enter)"
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="text-center mt-2 text-xs text-slate-400 dark:text-slate-500 select-none leading-relaxed">
        Clooney. A simple and easy to access A.I, friendly, helpful, and always ready to assist.
      </div>
    </div>
  );
};
