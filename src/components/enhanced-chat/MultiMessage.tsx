import React, { useEffect, useState } from 'react';
import type { MultiMessageProps, MessageTree } from './types';
import { MessageRender } from './MessageRender';
import { findMessageInTree } from '../../utils/buildMessageTree';

/**
 * MultiMessage component handles rendering of message trees
 * including parent-child relationships and sibling navigation
 */
export function MultiMessage({
  messageId,
  messagesTree,
  currentEditId,
  setCurrentEditId,
}: MultiMessageProps) {
  const [siblingIdx, setSiblingIdx] = useState(0);

  // Reset siblingIdx when the tree changes
  useEffect(() => {
    setSiblingIdx(0);
  }, [messagesTree?.length]);

  // Reset siblingIdx if it's out of bounds
  useEffect(() => {
    if (messagesTree?.length && siblingIdx >= messagesTree.length) {
      setSiblingIdx(0);
    }
  }, [siblingIdx, messagesTree?.length]);

  // Handle setting sibling index in reverse (for compatibility with LibreChat)
  const setSiblingIdxRev = (value: number) => {
    setSiblingIdx((messagesTree?.length ?? 0) - value - 1);
  };

  if (!messagesTree || messagesTree.length === 0) {
    return null;
  }

  // Get the current message based on sibling index
  const message = messagesTree[messagesTree.length - siblingIdx - 1];

  if (!message) {
    return null;
  }

  // If the message has children, render them recursively
  if (message.children && message.children.length > 0) {
    return (
      <>
        <MessageRender
          message={message}
          currentEditId={currentEditId}
          setCurrentEditId={setCurrentEditId}
          siblingIdx={messagesTree.length - siblingIdx - 1}
          siblingCount={messagesTree.length}
          setSiblingIdx={setSiblingIdxRev}
        />
        <MultiMessage
          key={message.id}
          messageId={message.id}
          messagesTree={message.children}
          currentEditId={currentEditId}
          setCurrentEditId={setCurrentEditId}
        />
      </>
    );
  }

  // If no children, just render the message
  return (
    <MessageRender
      message={message}
      currentEditId={currentEditId}
      setCurrentEditId={setCurrentEditId}
      siblingIdx={messagesTree.length - siblingIdx - 1}
      siblingCount={messagesTree.length}
      setSiblingIdx={setSiblingIdxRev}
    />
  );
}
