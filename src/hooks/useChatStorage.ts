import { useState, useEffect } from 'react';
import { Conversation, Message, AppSettings } from '../types';

const STORAGE_KEY_CONVERSATIONS = 'clooney_conversations_v1';
const STORAGE_KEY_ACTIVE_ID = 'clooney_active_conv_id_v1';
const STORAGE_KEY_SETTINGS = 'clooney_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  preferredTone: 'default',
  streamResponses: true,
  codeLineNumbers: true,
};

export function useChatStorage() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONVERSATIONS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load conversations from localStorage', e);
    }
    return [];
  });

  const [activeId, setActiveId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
      return saved || null;
    } catch {
      return null;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Save conversations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(conversations));
    } catch (e) {
      console.error('Failed to save conversations', e);
    }
  }, [conversations]);

  // Save activeId
  useEffect(() => {
    try {
      if (activeId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeId);
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
      }
    } catch (e) {
      console.error('Failed to save active id', e);
    }
  }, [activeId]);

  // Save settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  // Helper to create a new chat
  const createNewChat = (initialMessage?: string): string => {
    const newId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newConv: Conversation = {
      id: newId,
      title: initialMessage
        ? initialMessage.slice(0, 32).trim() + (initialMessage.length > 32 ? '...' : '')
        : 'New conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tone: settings.preferredTone,
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newId);
    return newId;
  };

  // Get currently active conversation
  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  // Add a message to the active conversation
  const addMessageToActive = (message: Message) => {
    if (!activeId) {
      const newId = createNewChat(message.content);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === newId
            ? {
                ...c,
                messages: [message],
                title: message.role === 'user'
                  ? message.content.slice(0, 32).trim() + (message.content.length > 32 ? '...' : '')
                  : c.title,
                updatedAt: Date.now(),
              }
            : c
        )
      );
      return;
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeId) {
          const updatedMessages = [...c.messages, message];
          // Auto-title if it's the first user message
          let newTitle = c.title;
          if (c.title === 'New conversation' && message.role === 'user' && message.content.trim()) {
            newTitle = message.content.slice(0, 34).trim() + (message.content.length > 34 ? '...' : '');
          }
          return {
            ...c,
            title: newTitle,
            messages: updatedMessages,
            updatedAt: Date.now(),
          };
        }
        return c;
      })
    );
  };

  // Update a message in the active conversation (e.g. streaming chunks or error)
  const updateMessageInActive = (messageId: string, updater: (prevMsg: Message) => Message) => {
    if (!activeId) return;

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeId) {
          return {
            ...c,
            messages: c.messages.map((m) => (m.id === messageId ? updater(m) : m)),
            updatedAt: Date.now(),
          };
        }
        return c;
      })
    );
  };

  // Rename a conversation
  const renameConversation = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle.trim(), updatedAt: Date.now() } : c))
    );
  };

  // Delete a conversation
  const deleteConversation = (id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (activeId === id) {
        setActiveId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  // Clear all conversations
  const clearAllConversations = () => {
    setConversations([]);
    setActiveId(null);
  };

  return {
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
  };
}
