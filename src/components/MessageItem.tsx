import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  FileText,
  FileCode,
  FileSpreadsheet,
  File as FileGeneric,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Download,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Message, Attachment, GeneratedImage } from '../types';
import { ClooneyLogo } from './ClooneyLogo';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageItemProps {
  message: Message;
  onOpenImageViewer: (imageUrl: string, prompt?: string) => void;
  onGenerateImagePrompt?: (prompt: string) => void;
  onRefinePrompt?: (prompt: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onOpenImageViewer,
  onGenerateImagePrompt,
  onRefinePrompt,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Stop speech if unmounted
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Clean formatting and codeblocks for natural spoken audio
    const plainText = message.content
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/\[IMAGE_PROMPT:[\s\S]*?\]/g, '')
      .replace(/[*#_`$]/g, '')
      .trim();

    if (!plainText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel'))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  // Helper to choose file icon
  const getFileIcon = (type: string, name: string) => {
    if (type.includes('pdf')) return <FileText size={16} className="text-red-400" />;
    if (type.includes('sheet') || type.includes('csv')) return <FileSpreadsheet size={16} className="text-emerald-400" />;
    if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.py') || name.endsWith('.json')) {
      return <FileCode size={16} className="text-amber-400" />;
    }
    return <FileGeneric size={16} className="text-[#85dfc7]" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div
      className={`group py-4 sm:py-6 transition-all duration-200 ${
        isUser ? 'flex justify-end' : 'flex justify-start'
      }`}
    >
      <div className={`w-full max-w-3xl ${isUser ? 'flex flex-col items-end' : 'flex items-start gap-4'}`}>
        {/* Clooney Avatar on the left */}
        {!isUser && (
          <div className="shrink-0 mt-0.5">
            <ClooneyLogo size={34} withSparkAnimation={message.isStreaming} />
          </div>
        )}

        <div className={`flex-1 min-w-0 ${isUser ? 'max-w-2xl' : ''}`}>
          {/* User Message: Slate Ocean Bubble */}
          {isUser ? (
            <div className="bg-[#24303e] text-white px-5 py-3.5 rounded-2xl rounded-tr-xs shadow-sm border border-[#32455b]">
              {/* Attachments within user bubble */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {message.attachments.map((att) => {
                    const isImg = att.type.startsWith('image/') && att.dataUrl;
                    return (
                      <div
                        key={att.id}
                        onClick={() => isImg && onOpenImageViewer(att.dataUrl!, att.name)}
                        className={`flex items-center gap-2 p-2 rounded-xl bg-[#1c2633] border border-[#374c63] text-xs text-slate-200 ${
                          isImg ? 'cursor-pointer hover:border-[#85dfc7]' : ''
                        }`}
                      >
                        {isImg ? (
                          <img
                            src={att.dataUrl}
                            alt={att.name}
                            className="w-8 h-8 rounded-md object-cover border border-[#485d77]"
                          />
                        ) : (
                          getFileIcon(att.type, att.name)
                        )}
                        <div className="max-w-[140px] truncate">
                          <div className="font-medium truncate">{att.name}</div>
                          <div className="text-[10px] text-slate-400">{formatFileSize(att.size)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Message text */}
              <div className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                {message.content}
              </div>
            </div>
          ) : (
            /* Clooney Response: Clean text with NO bubble, Gemini-style */
            <div className="space-y-3">
              {/* Message Content rendered with Markdown, LaTeX/KaTeX, and Code blocks */}
              <div className="text-slate-800 dark:text-slate-100 text-sm sm:text-base leading-relaxed">
                {message.content ? (
                  <MarkdownRenderer
                    content={message.content}
                    onGenerateImagePrompt={onGenerateImagePrompt}
                  />
                ) : message.isStreaming ? (
                  /* Thinking / Typing indicator in Cloud Mint */
                  <div className="flex items-center gap-1.5 py-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#85dfc7] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#85dfc7] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#85dfc7] animate-bounce" />
                    <span className="ml-2 text-xs font-medium text-slate-400">Clooney is thinking...</span>
                  </div>
                ) : null}
              </div>

              {/* Streaming active indicator if still generating text */}
              {message.isStreaming && message.content && (
                <div className="inline-flex items-center gap-1 text-xs text-[#85dfc7] font-medium pt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#85dfc7] animate-ping" />
                  <span>Streaming...</span>
                </div>
              )}

              {/* Active Image Generation Indicator */}
              {message.isGeneratingImage && (
                <div className="rounded-2xl border border-[#85dfc7]/40 bg-[#16202c] p-6 flex flex-col items-center justify-center gap-3 text-center my-3 shadow-md animate-pulse">
                  <div className="relative">
                    <Sparkles size={24} className="text-[#85dfc7] animate-spin" />
                    <div className="absolute -inset-2 bg-[#85dfc7]/20 rounded-full blur-md" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-slate-100">
                      Generating your image with exact details...
                    </div>
                    <div className="text-xs text-slate-400">
                      Rendering subjects, lighting, perspective, and composition
                    </div>
                  </div>
                </div>
              )}

              {/* Inline Generated Images */}
              {message.generatedImages && message.generatedImages.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {message.generatedImages.map((img) => (
                    <div
                      key={img.id}
                      className="group/img relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#16202c] shadow-md transition-all hover:shadow-xl"
                    >
                      <img
                        src={img.url}
                        alt={img.prompt}
                        onClick={() => onOpenImageViewer(img.url, img.prompt)}
                        className="w-full aspect-square object-cover cursor-pointer transition-transform duration-300 group-hover/img:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                        <p className="text-white text-xs line-clamp-2 mb-2 font-medium">
                          {img.prompt}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenImageViewer(img.url, img.prompt)}
                            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs text-xs flex items-center gap-1"
                            title="Expand"
                          >
                            <ExternalLink size={13} />
                            <span>View</span>
                          </button>
                          {onRefinePrompt && (
                            <button
                              onClick={() => onRefinePrompt(`Refine this image to add more details: "${img.prompt}"`)}
                              className="p-1.5 rounded-lg bg-[#85dfc7] hover:bg-[#9de6d3] text-[#16202b] font-semibold text-xs flex items-center gap-1 shadow-sm"
                              title="Refine image"
                            >
                              <RefreshCw size={13} />
                              <span>Refine</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error state if any */}
              {message.error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                  {message.error}
                </div>
              )}

              {/* Footer action bar for Clooney responses */}
              {!message.isStreaming && message.content && (
                <div className="flex items-center gap-1.5 pt-1 text-slate-400 opacity-60 hover:opacity-100 transition-opacity">
                  <button
                    onClick={handleCopyContent}
                    className="p-1.5 rounded-lg hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Copy response"
                  >
                    {copied ? <Check size={14} className="text-[#85dfc7]" /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={handleToggleSpeech}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isSpeaking
                        ? 'text-[#85dfc7] bg-[#85dfc7]/20 opacity-100'
                        : 'hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={isSpeaking ? 'Stop speaking' : 'Read aloud with voice'}
                  >
                    {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                  <span className="text-[11px] text-slate-400 ml-1">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
