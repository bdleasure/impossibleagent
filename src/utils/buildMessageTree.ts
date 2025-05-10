import type { Message, MessageTree } from "../types/message";

/**
 * Builds a tree structure from flat messages
 * @param messages Flat array of messages
 * @returns Tree structure of messages
 */
export function buildMessageTree(messages: Message[]): MessageTree[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  // Create a map of messages by ID for quick lookup
  const messageMap = new Map<string, MessageTree>();
  
  // First pass: Create MessageTree objects and add to map
  messages.forEach((message) => {
    const messageTree: MessageTree = {
      ...message,
      children: [],
      depth: 0,
      isCreatedByUser: message.role === 'user',
    };
    
    messageMap.set(message.id, messageTree);
  });
  
  // Second pass: Build the tree structure
  const rootMessages: MessageTree[] = [];
  
  messages.forEach((message) => {
    const messageTree = messageMap.get(message.id);
    
    if (!messageTree) return;
    
    // If this message has a parent reference in metadata, add it as a child
    if (message.metadata?.parentId && messageMap.has(message.metadata.parentId)) {
      const parent = messageMap.get(message.metadata.parentId);
      if (parent && parent.children) {
        parent.children.push(messageTree);
        messageTree.depth = (parent.depth || 0) + 1;
      }
    } else {
      // If no parent, it's a root message
      rootMessages.push(messageTree);
    }
  });
  
  // Sort root messages by timestamp
  rootMessages.sort((a, b) => a.timestamp - b.timestamp);
  
  // Process sibling information
  processSiblings(rootMessages);
  
  return rootMessages;
}

/**
 * Process sibling information for messages
 * @param messages Array of messages to process
 */
function processSiblings(messages: MessageTree[]) {
  // Group messages by parent ID
  const messagesByParent = new Map<string | undefined, MessageTree[]>();
  
  // Function to process a level of the tree
  const processLevel = (msgs: MessageTree[]) => {
    // Group by parent ID or 'root' for top-level messages
    msgs.forEach((msg) => {
      const parentId = msg.metadata?.parentId || 'root';
      if (!messagesByParent.has(parentId)) {
        messagesByParent.set(parentId, []);
      }
      messagesByParent.get(parentId)?.push(msg);
      
      // Process children recursively
      if (msg.children && msg.children.length > 0) {
        processLevel(msg.children);
      }
    });
  };
  
  // Start processing from root
  processLevel(messages);
  
  // Set sibling information for each group
  messagesByParent.forEach((siblings) => {
    siblings.forEach((msg, idx) => {
      msg.siblingIdx = idx;
      msg.siblingCount = siblings.length;
    });
  });
}

/**
 * Finds a message in the tree by ID
 * @param tree Message tree to search
 * @param id ID of the message to find
 * @returns The found message or undefined
 */
export function findMessageInTree(tree: MessageTree[], id: string): MessageTree | undefined {
  for (const message of tree) {
    if (message.id === id) {
      return message;
    }
    
    if (message.children && message.children.length > 0) {
      const found = findMessageInTree(message.children, id);
      if (found) {
        return found;
      }
    }
  }
  
  return undefined;
}

/**
 * Adds a new message to the tree
 * @param tree Existing message tree
 * @param message New message to add
 * @param parentId Optional parent ID
 * @returns Updated message tree
 */
export function addMessageToTree(
  tree: MessageTree[],
  message: Message,
  parentId?: string
): MessageTree[] {
  const newTree = [...tree];
  
  const newMessage: MessageTree = {
    ...message,
    children: [],
    depth: 0,
    isCreatedByUser: message.role === 'user',
  };
  
  if (parentId) {
    // Find parent and add as child
    const parent = findMessageInTree(newTree, parentId);
    if (parent) {
      parent.children = parent.children || [];
      newMessage.depth = (parent.depth || 0) + 1;
      newMessage.metadata = {
        ...newMessage.metadata,
        parentId,
      };
      parent.children.push(newMessage);
      
      // Update sibling information
      if (parent.children && parent.children.length > 0) {
        parent.children.forEach((child, idx) => {
          child.siblingIdx = idx;
          child.siblingCount = parent.children?.length || 0;
        });
      }
    } else {
      // If parent not found, add to root
      newTree.push(newMessage);
    }
  } else {
    // Add to root
    newTree.push(newMessage);
    
    // Update sibling information for root messages
    newTree.forEach((msg, idx) => {
      msg.siblingIdx = idx;
      msg.siblingCount = newTree.length;
    });
  }
  
  return newTree;
}
