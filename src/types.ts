export type MessageRole = 'user' | 'assistant' | 'system';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string; // base64 representation
  content?: string; // text representation if text/code
  previewUrl?: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: number;
  source?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  generatedImages?: GeneratedImage[];
  isStreaming?: boolean;
  isGeneratingImage?: boolean;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  tone?: string;
}

export type ToneType = 'default' | 'casual' | 'formal' | 'concise' | 'humorous' | 'technical' | 'creative';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  preferredTone: ToneType;
  streamResponses: boolean;
  codeLineNumbers: boolean;
}
