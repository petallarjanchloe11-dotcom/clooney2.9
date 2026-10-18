import React, { useRef, useEffect, useState } from 'react';
import {
  Menu,
  ArrowDown,
  Sun,
  Moon,
  Trash2,
} from 'lucide-react';
import { Conversation, Message, Attachment, ToneType, AppSettings } from '../types';
import { ClooneyLogo } from './ClooneyLogo';
import { MessageItem } from './MessageItem';
import { InputBar } from './InputBar';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface ChatAreaProps {
  conversation: Conversation | null;
  onSendMessage: (content: string, attachments: Attachment[], tone?: ToneType) => void;
  isLoading: boolean;
  onStopGeneration?: () => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  settings: AppSettings;
  onToggleTheme: () => void;
  onOpenImageViewer: (url: string, prompt?: string) => void;
  onGenerateImagePrompt: (prompt: string) => void;
  onDeleteCurrentChat: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  onSendMessage,
  isLoading,
  onStopGeneration,
  onToggleSidebar,
  onOpenSettings,
  settings,
  onToggleTheme,
  onOpenImageViewer,
  onGenerateImagePrompt,
  onDeleteCurrentChat,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [currentTone, setCurrentTone] = useState<ToneType>(
    (conversation?.tone as ToneType) || settings.preferredTone || 'default'
  );
  const [suggestedInput, setSuggestedInput] = useState<string>('');

  // Web Speech API implementation in ChatArea component:
  // Enables continuous recognition mode, interimResults: true, and language auto-detection
  const speechRecognition = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    autoDetectLanguage: true,
    onTranscriptUpdate: (spokenText) => {
      setSuggestedInput(spokenText);
    },
  });

  const messages = conversation?.messages || [];

  // Update tone if conversation changes
  useEffect(() => {
    if (conversation?.tone) {
      setCurrentTone(conversation.tone as ToneType);
    }
  }, [conversation?.id, conversation?.tone]);

  // Auto-scroll on new messages or streaming chunks
  useEffect(() => {
    if (!showScrollBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showScrollBottom]);

  // Check scroll position to display "Scroll to bottom" button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isFarFromBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#131b24] text-slate-800 dark:text-slate-100 overflow-hidden relative">
      {/* Top Header */}
      <header className="h-14 sm:h-16 px-4 flex items-center justify-between border-b border-slate-200/80 dark:border-[#22303f] bg-white/70 dark:bg-[#16202b]/70 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#253344] transition-colors"
            title="Toggle sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 truncate">
            <h1 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate">
              {conversation?.title || 'New conversation'}
            </h1>
            {currentTone !== 'default' && (
              <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#85dfc7]/15 text-[#134e48] dark:text-[#85dfc7] border border-[#85dfc7]/25">
                {currentTone}
              </span>
            )}
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Theme Quick Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#253344] transition-colors"
            title={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Delete chat if messages exist */}
          {conversation && conversation.messages.length > 0 && (
            <button
              onClick={onDeleteCurrentChat}
              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-[#253344] transition-colors"
              title="Delete this conversation"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Main Message Stream or Welcome Screen */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 flex flex-col"
      >
        {messages.length === 0 ? (
          /* Simple, clean ChatGPT-style home page */
          <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-center px-4 my-auto animate-in fade-in duration-200 select-none">
            <div className="mb-6 relative">
              <ClooneyLogo size={52} withSparkAnimation />
              <div className="absolute -inset-2 bg-[#85dfc7]/20 rounded-full blur-md -z-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              How can I help you?
            </h2>
          </div>
        ) : (
          /* Active Chat Conversation */
          <div className="max-w-3xl mx-auto py-4">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                onOpenImageViewer={onOpenImageViewer}
                onGenerateImagePrompt={onGenerateImagePrompt}
                onRefinePrompt={(refineText) => setSuggestedInput(refineText)}
              />
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute right-6 bottom-24 p-2.5 rounded-full bg-white dark:bg-[#24303e] border border-slate-200 dark:border-slate-700 shadow-lg text-slate-700 dark:text-slate-200 hover:text-[#85dfc7] transition-all z-20 flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowDown size={14} />
          <span>Latest</span>
        </button>
      )}

      {/* Bottom Fixed Input Bar */}
      <InputBar
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        onStopGeneration={onStopGeneration}
        currentTone={currentTone}
        onChangeTone={setCurrentTone}
        suggestedInput={suggestedInput}
        onClearSuggestedInput={() => setSuggestedInput('')}
        speechRecognition={speechRecognition}
      />
    </div>
  );
};
