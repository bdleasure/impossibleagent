/**
 * This file contains a fix for the memory retrieval issue when chat history is cleared.
 * 
 * The problem:
 * When the chat history is cleared, the agent doesn't retrieve memories from the database
 * because it's only looking at the current conversation context (the messages array).
 * 
 * The solution:
 * 1. Modify the getRelevantMemories method to work even when the chat history is cleared
 * 2. Add a direct memory query method that can be used to search for specific memories
 * 3. Update the onChatMessage method to use the direct memory query when appropriate
 */

import { MemoryManager } from "../memory/MemoryManager";

/**
 * Function to directly query memories based on a search term
 * This can be used even when the chat history is cleared
 */
export async function directMemoryQuery(agent: any, query: string, limit: number = 5) {
  try {
    // Initialize memory manager
    const memoryManager = new MemoryManager({ agent });
    
    // Log the query for debugging
    console.log(`Performing direct memory query for: "${query}"`);
    
    // Use the memory manager to retrieve memories based on the query
    const memories = await memoryManager.retrieveMemories(query, { limit });
    
    console.log(`Retrieved ${memories.length} memories for query "${query}"`);
    
    return memories;
  } catch (error) {
    console.error("Error in direct memory query:", error);
    return [];
  }
}

/**
 * Function to check if a message is asking about memories
 * This helps identify when to perform a direct memory query
 */
export function isAskingAboutMemories(message: string): boolean {
  // Convert to lowercase for case-insensitive matching
  const lowerMessage = message.toLowerCase();
  
  // Check for common memory-related phrases
  const memoryPhrases = [
    "do you remember",
    "what did i say about",
    "what kind of",
    "what type of",
    "what is my favorite",
    "what are my favorite",
    "do i like",
    "did i mention",
    "have i told you about",
    "what do i love",
    "what do you know about me",
    "what have i told you",
    "what do you remember"
  ];
  
  // Check if any of the memory phrases are in the message
  return memoryPhrases.some(phrase => lowerMessage.includes(phrase));
}

/**
 * Function to extract key terms from a query for better memory retrieval
 */
export function extractKeyTerms(query: string): string {
  // Convert to lowercase
  const lowerQuery = query.toLowerCase();
  
  // Remove common question words and phrases that might interfere with memory retrieval
  const phrasesToRemove = [
    "do you remember",
    "what did i say about",
    "what kind of",
    "what type of",
    "what is my favorite",
    "what are my favorite",
    "do i like",
    "did i mention",
    "have i told you about",
    "what do i love",
    "what do you know about me",
    "what have i told you",
    "what do you remember"
  ];
  
  let cleanedQuery = lowerQuery;
  for (const phrase of phrasesToRemove) {
    cleanedQuery = cleanedQuery.replace(phrase, "");
  }
  
  // Remove common filler words
  const fillerWords = [
    "the", "a", "an", "and", "or", "but", "if", "because", "as", "what", "which", "who", "whom", "whose",
    "when", "where", "why", "how", "that", "this", "these", "those", "am", "is", "are", "was", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "shall", "should", "may",
    "might", "must", "can", "could", "about", "above", "across", "after", "against", "along", "among",
    "around", "at", "before", "behind", "below", "beneath", "beside", "between", "beyond", "by", "down",
    "during", "except", "for", "from", "in", "inside", "into", "like", "near", "of", "off", "on", "out",
    "outside", "over", "past", "since", "through", "throughout", "to", "toward", "under", "underneath",
    "until", "up", "upon", "with", "within", "without"
  ];
  
  // Split the query into words
  const words = cleanedQuery.split(/\s+/).filter(word => word.length > 0);
  
  // Filter out filler words
  const keyWords = words.filter(word => !fillerWords.includes(word));
  
  // Join the key words back into a string
  return keyWords.join(" ").trim();
}

/**
 * Instructions for implementing the fix:
 * 
 * 1. In PersonalAgent.ts, modify the getRelevantMemories method to use directMemoryQuery
 *    when the chat history is cleared or when the user is asking about memories.
 * 
 * 2. In the onChatMessage method of RegisteredPersonalAgent, check if the user's message
 *    is asking about memories and use directMemoryQuery if it is.
 * 
 * 3. Update the system prompt to emphasize that the agent has access to memories
 *    stored in the SQL database, even when the chat history is cleared.
 * 
 * Example implementation for the onChatMessage method:
 * 
 * ```typescript
 * async onChatMessage(
 *   onFinish: StreamTextOnFinishCallback<ToolSet>,
 *   chatOptions?: { abortSignal?: AbortSignal }
 * ) {
 *   // Ensure the agent is initialized
 *   await this.ensureInitialized();
 *   
 *   // Update last active timestamp
 *   this.setState({
 *     ...this.state,
 *     lastActive: new Date().toISOString()
 *   });
 *
 *   // Get the last user message for context
 *   const lastUserMessage = [...this.messages].reverse().find(m => m.role === 'user');
 *   let relevantMemories: Memory[] = [];
 *   
 *   if (lastUserMessage && lastUserMessage.content) {
 *     const content = typeof lastUserMessage.content === 'string' 
 *       ? lastUserMessage.content 
 *       : JSON.stringify(lastUserMessage.content);
 *     
 *     // Check if the user is asking about memories
 *     const isMemoryQuery = isAskingAboutMemories(content);
 *     
 *     if (isMemoryQuery) {
 *       // Extract key terms for better memory retrieval
 *       const keyTerms = extractKeyTerms(content);
 *       console.log(`Memory query detected. Key terms: "${keyTerms}"`);
 *       
 *       // Use direct memory query for memory-related questions
 *       relevantMemories = await directMemoryQuery(this, keyTerms, 5);
 *     } else {
 *       // Use the regular memory retrieval for non-memory queries
 *       relevantMemories = await this.getRelevantMemories(5);
 *     }
 *   }
 *   
 *   // Rest of the method...
 * }
 * ```
 */
