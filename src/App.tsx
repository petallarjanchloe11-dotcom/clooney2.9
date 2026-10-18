import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SettingsModal } from './components/SettingsModal';
import { ImageViewerModal } from './components/ImageViewerModal';
import { useChatStorage } from './hooks/useChatStorage';
import { Attachment, Message, ToneType, GeneratedImage } from './types';

export default function App() {
  const {
    conversations,
    activeId,
    setActiveId,
    activeConversation,
    createNewChat,
    addMessageToActive,
    updateMessageInActive,
    renameConversation,
    deleteConversation,
    clearAllConversations,
    settings,
    setSettings,
  } = useChatStorage();

  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [imageModalState, setImageModalState] = useState<{
    isOpen: boolean;
    url: string;
    prompt?: string;
  }>({
    isOpen: false,
    url: '',
    prompt: '',
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Detect mobile screen width
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync theme (light / dark)
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isSystemDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  // Keyboard shortcut Alt+N for new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        createNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createNewChat]);

  // Handle generating image from prompt
  const handleGenerateImage = useCallback(async (promptText: string) => {
    if (!promptText.trim()) return;

    const imgId = 'img_' + Date.now();
    const assistantMsgId = 'asst_' + Date.now();

    // Add assistant placeholder with active generation indicator
    addMessageToActive({
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: false,
      isGeneratingImage: true,
    });

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      });

      const data = await res.json();

      if (data.success && data.imageUrl) {
        const generatedImage: GeneratedImage = {
          id: imgId,
          url: data.imageUrl,
          prompt: promptText,
          createdAt: Date.now(),
          source: data.source,
        };

        updateMessageInActive(assistantMsgId, (prev) => ({
          ...prev,
          content: `Here is your image for **"${promptText}"**. You can click to view in full resolution or ask for revisions!`,
          generatedImages: [generatedImage],
          isGeneratingImage: false,
        }));
      } else {
        updateMessageInActive(assistantMsgId, (prev) => ({
          ...prev,
          content: `I couldn't generate the image right now. ${data.error || ''}`,
          isGeneratingImage: false,
          error: data.error,
        }));
      }
    } catch (err: any) {
      console.error('Image generation error:', err);
      updateMessageInActive(assistantMsgId, (prev) => ({
        ...prev,
        content: `Error generating image: ${err?.message || 'Network error'}`,
        isStreaming: false,
        error: err?.message,
      }));
    }
  }, [addMessageToActive, updateMessageInActive]);

  // Handle sending a message
  const handleSendMessage = async (
    content: string,
    attachments: Attachment[] = [],
    tone: ToneType = 'default'
  ) => {
    if (!content.trim() && attachments.length === 0) return;

    let targetConv = activeConversation;
    if (!targetConv) {
      const newId = createNewChat(content || attachments[0]?.name || 'Chat');
      targetConv = {
        id: newId,
        title: (content || attachments[0]?.name || 'Chat').slice(0, 32),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tone,
      };
    }

    // 1. Add user message
    const userMsgId = 'user_' + Date.now();
    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content,
      attachments,
      timestamp: Date.now(),
    };
    addMessageToActive(userMessage);

    // Find last generated image in the current conversation for revision support
    const allPrevImages = (targetConv ? targetConv.messages : [])
      .flatMap((m) => m.generatedImages || []);
    const lastImage = allPrevImages.length > 0 ? allPrevImages[allPrevImages.length - 1] : null;

    const isRevision = !!(
      lastImage &&
      /\b(make it|change the|add a|remove the|turn it into|replace the|adjust the|recolor|brighter|darker|watercolor|photorealistic|more|less)\b/i.test(content)
    );

    const isExplicitImageRequest =
      /\b(generate|create|draw|paint|illustrate|render|produce|make)\s+(an?\s+)?(image|picture|photo|drawing|illustration|graphic|artwork)\b/i.test(content) ||
      /\b(picture|image|photo|drawing)\s+of\b/i.test(content) ||
      /\b(can you (draw|paint|illustrate|create an image|make a picture))\b/i.test(content);

    // 2. Prepare assistant placeholder
    const assistantMsgId = 'asst_' + Date.now();
    const placeholderAssistant: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      isGeneratingImage: isExplicitImageRequest || isRevision,
    };
    addMessageToActive(placeholderAssistant);

    let imageTriggered = false;

    // Trigger image generation immediately if user made an explicit request
    if (isExplicitImageRequest || isRevision) {
      imageTriggered = true;
      triggerInlineImageGeneration(
        assistantMsgId,
        content,
        lastImage?.prompt,
        isRevision
      );
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    // Prepare full conversation history for context
    const currentMessages = targetConv ? [...targetConv.messages, userMessage] : [userMessage];
    const apiMessages = currentMessages.map((m) => ({
      role: m.role,
      content: m.content,
      attachments: m.attachments,
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          tone,
          stream: settings.streamResponses,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      if (settings.streamResponses && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let detectedImagePrompt: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') {
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  accumulatedText += parsed.text;
                  updateMessageInActive(assistantMsgId, (prev) => ({
                    ...prev,
                    content: accumulatedText,
                  }));
                } else if (parsed.error) {
                  // If content was already received and the error is the SDK's trailing SSE delimiter artifact, ignore it
                  if (accumulatedText.trim().length > 0 && parsed.error.includes('Incomplete JSON segment')) {
                    continue;
                  }
                  updateMessageInActive(assistantMsgId, (prev) => ({
                    ...prev,
                    error: parsed.error,
                  }));
                }
              } catch (e) {
                // Ignore parse errors on raw tokens
              }
            }
          }
        }

        // Check if an image prompt was embedded in Clooney's response
        const match = /\[IMAGE_PROMPT:\s*([^\]]+)\]/i.exec(accumulatedText);
        if (match && match[1]) {
          detectedImagePrompt = match[1].trim();
        }

        // Finalize streaming
        updateMessageInActive(assistantMsgId, (prev) => ({
          ...prev,
          isStreaming: false,
        }));

        // If Clooney returned an image prompt and not already triggered, execute it
        if (detectedImagePrompt && !imageTriggered) {
          triggerInlineImageGeneration(
            assistantMsgId,
            detectedImagePrompt,
            lastImage?.prompt,
            isRevision
          );
        }
      } else {
        // Non-streaming response
        const data = await response.json();
        const responseText = data.text || '';
        updateMessageInActive(assistantMsgId, (prev) => ({
          ...prev,
          content: responseText,
          isStreaming: false,
        }));

        const match = /\[IMAGE_PROMPT:\s*([^\]]+)\]/i.exec(responseText);
        if (match && match[1] && !imageTriggered) {
          triggerInlineImageGeneration(
            assistantMsgId,
            match[1].trim(),
            lastImage?.prompt,
            isRevision
          );
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error generating chat response:', err);
        updateMessageInActive(assistantMsgId, (prev) => ({
          ...prev,
          content: prev.content || 'I encountered an issue processing your request.',
          isStreaming: false,
          error: prev.content?.trim() ? undefined : (err.message || 'Network error occurred.'),
        }));
      } else {
        updateMessageInActive(assistantMsgId, (prev) => ({
          ...prev,
          isStreaming: false,
        }));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Helper to trigger inline image generation attached to assistant message
  const triggerInlineImageGeneration = async (
    msgId: string,
    promptText: string,
    referencePrompt?: string,
    isRevision?: boolean
  ) => {
    updateMessageInActive(msgId, (prev) => ({
      ...prev,
      isGeneratingImage: true,
    }));

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          referencePrompt,
          isRevision,
        }),
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        const newImg: GeneratedImage = {
          id: 'img_' + Date.now(),
          url: data.imageUrl,
          prompt: promptText,
          createdAt: Date.now(),
          source: data.source,
        };
        updateMessageInActive(msgId, (prev) => ({
          ...prev,
          isGeneratingImage: false,
          generatedImages: [...(prev.generatedImages || []), newImg],
        }));
      } else {
        updateMessageInActive(msgId, (prev) => ({
          ...prev,
          isGeneratingImage: false,
          error: data.error || 'Failed to generate image',
        }));
      }
    } catch (e: any) {
      console.warn('Failed inline image generation:', e);
      updateMessageInActive(msgId, (prev) => ({
        ...prev,
        isGeneratingImage: false,
      }));
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc] dark:bg-[#131b24] select-text">
      {/* Sidebar with saved chat history in Slate Ocean */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={(id) => setActiveId(id)}
        onNewChat={() => createNewChat()}
        onRenameConversation={renameConversation}
        onDeleteConversation={deleteConversation}
        onOpenSettings={() => setSettingsOpen(true)}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        isMobile={isMobile}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full min-w-0">
        <ChatArea
          conversation={activeConversation}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onStopGeneration={handleStopGeneration}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenSettings={() => setSettingsOpen(true)}
          settings={settings}
          onToggleTheme={toggleTheme}
          onOpenImageViewer={(url, prompt) =>
            setImageModalState({ isOpen: true, url, prompt })
          }
          onGenerateImagePrompt={handleGenerateImage}
          onDeleteCurrentChat={() => {
            if (activeId) deleteConversation(activeId);
          }}
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onClearHistory={clearAllConversations}
      />

      {/* Image Viewer Fullscreen Modal */}
      <ImageViewerModal
        isOpen={imageModalState.isOpen}
        onClose={() => setImageModalState((prev) => ({ ...prev, isOpen: false }))}
        imageUrl={imageModalState.url}
        prompt={imageModalState.prompt}
        onRefinePrompt={(refineText) => {
          handleSendMessage(refineText, []);
        }}
      />
    </div>
  );
}
