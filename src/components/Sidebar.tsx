import React, { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { Conversation } from '../types';
import { ClooneyLogo } from './ClooneyLogo';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  isMobile: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  onOpenSettings,
  isOpen,
  onToggleOpen,
  isMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = c.title.toLowerCase().includes(query);
    const contentMatch = c.messages.some((m) => m.content.toLowerCase().includes(query));
    return titleMatch || contentMatch;
  });

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const saveEditing = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingTitle.trim()) {
      onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteConversation(id);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-xs transition-opacity"
          onClick={onToggleOpen}
        />
      )}

      {/* Sidebar container in Slate Ocean */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col bg-[#1c2633] text-slate-200 transition-all duration-300 ease-in-out border-r border-[#2a3848] ${
          isOpen ? 'w-72 sm:w-80 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0'
        }`}
      >
        {/* Top Header / Brand */}
        <div className="p-4 flex items-center justify-between border-b border-[#2a3848]">
          <div className="flex items-center gap-2.5">
            <ClooneyLogo size={32} withSparkAnimation />
            <div>
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                Clooney
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#85dfc7]/15 text-[#85dfc7] border border-[#85dfc7]/20">
                  AI
                </span>
              </span>
            </div>
          </div>
          <button
            onClick={onToggleOpen}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#253344] transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              if (isMobile) onToggleOpen();
            }}
            className="w-full py-2.5 px-3.5 rounded-xl bg-[#28384a] hover:bg-[#32455b] border border-[#374c63] text-white font-medium text-sm flex items-center justify-between transition-all group shadow-sm active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <Plus size={18} className="text-[#85dfc7] group-hover:rotate-90 transition-transform duration-200" />
              <span>New chat</span>
            </span>
            <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1c2633] text-slate-400 border border-[#32455b]">
              Alt+N
            </kbd>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#16202c] border border-[#2a3848] rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#85dfc7] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-slate-400">
              {searchQuery ? 'No matching conversations' : 'No past conversations yet. Start a new chat!'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeId;
              const isEditing = conv.id === editingId;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    if (isMobile) onToggleOpen();
                  }}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#2a3a4c] text-white font-medium border-l-3 border-[#85dfc7]'
                      : 'text-slate-300 hover:bg-[#233140] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
                    <MessageSquare
                      size={15}
                      className={isActive ? 'text-[#85dfc7] shrink-0' : 'text-slate-400 group-hover:text-slate-300 shrink-0'}
                    />

                    {isEditing ? (
                      <form
                        onSubmit={(e) => saveEditing(conv.id, e)}
                        className="flex items-center gap-1 flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          autoFocus
                          className="w-full bg-[#16202c] border border-[#85dfc7] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="p-1 text-[#85dfc7] hover:text-white"
                          title="Save"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </form>
                    ) : (
                      <span className="truncate">{conv.title}</span>
                    )}
                  </div>

                  {/* Action buttons (Rename, Delete) */}
                  {!isEditing && (
                    <div
                      className={`flex items-center gap-1 transition-opacity ${
                        isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <button
                        onClick={(e) => startEditing(conv, e)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#32455b] transition-colors"
                        title="Rename"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(conv.id, e)}
                        className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-[#32455b] transition-colors"
                        title="Delete chat"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Section: Assistant details & Settings */}
        <div className="p-3 border-t border-[#2a3848] bg-[#17202c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#85dfc7] animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">
              Clooney 2.5
            </span>
          </div>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#253344] text-xs transition-colors"
            title="Settings"
          >
            <Settings size={14} className="text-[#85dfc7]" />
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};
