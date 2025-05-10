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
