import type { ReactNode } from 'react';

/**
 * Message role type
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Base message interface
 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isImportant?: boolean;
  feedback?: 'like' | 'dislike';
  metadata?: Record<string, any>;
}

/**
 * Tree-based message structure
 */
export interface MessageTree extends Message {
  children?: MessageTree[];
  depth?: number;
  unfinished?: boolean;
  error?: boolean;
  isCreatedByUser?: boolean;
  siblingIdx?: number;
  siblingCount?: number;
}

/**
 * Message group props
 */
export interface MessageGroupProps {
  children: ReactNode;
  timestamp?: number;
  className?: string;
}

/**
 * Message bubble props
 */
export interface MessageBubbleProps {
  message: Message;
  isImportant?: boolean;
  showMemoryIndicator?: boolean;
  className?: string;
  isEditing?: boolean;
  onEditComplete?: (content: string) => void;
}

/**
 * Message actions props
 */
export interface MessageActionsProps {
  messageId: string;
  role: MessageRole;
  onMarkImportant?: () => void;
  onLike?: () => void;
  onDislike?: () => void;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onContinue?: () => void;
  onEdit?: () => void;
  feedback?: 'like' | 'dislike';
  className?: string;
  isLast?: boolean;
}

/**
 * Chat input props
 */
export interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
  onVoiceToggle?: () => void;
  isVoiceActive?: boolean;
  onFileUpload?: (file: File) => void;
  onEmojiSelect?: (emoji: string) => void;
  className?: string;
  placeholder?: string;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

/**
 * Enhanced chat interface props
 */
export interface EnhancedChatProps {
  agentName?: string;
  chatId?: string;
  showAvatar?: boolean;
  showMemoryIndicators?: boolean;
  className?: string;
  onMarkImportant?: (messageId: string) => void;
  onProvideFeedback?: (messageId: string, feedback: 'like' | 'dislike') => void;
  onVoiceToggle?: () => void;
  isVoiceActive?: boolean;
  voiceTranscript?: string;
  onFileUpload?: (file: File) => void;
}

/**
 * Badge item for chat context
 */
export interface BadgeItem {
  id: string;
  text: string;
  type?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  removable?: boolean;
}

/**
 * Message render props
 */
export interface MessageRenderProps {
  message: MessageTree;
  currentEditId?: string | number | null;
  setCurrentEditId?: React.Dispatch<React.SetStateAction<string | number | null>>;
  siblingIdx?: number;
  siblingCount?: number;
  setSiblingIdx?: (idx: number) => void;
  isCard?: boolean;
  isMultiMessage?: boolean;
}

/**
 * Multi message props
 */
export interface MultiMessageProps {
  messageId: string | null;
  messagesTree?: MessageTree[] | null;
  currentEditId?: string | number | null;
  setCurrentEditId?: React.Dispatch<React.SetStateAction<string | number | null>>;
  conversation?: any;
}
