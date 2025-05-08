import { Agent } from "agents";
import { KnowledgeBase } from "./KnowledgeBase";

/**
 * Interface for extracted knowledge
 */
export interface ExtractedKnowledge {
  fact: string;
  confidence: number;
  source: string;
  category: string;
  tags: string[];
}

/**
 * KnowledgeExtractor handles extracting knowledge from conversations
 * and other sources to populate the knowledge base
 */
export class KnowledgeExtractor<Env> {
  /**
   * Create a new KnowledgeExtractor instance
   * @param agent The agent instance
   * @param knowledgeBase The knowledge base to store extracted knowledge
   */
  constructor(
    private agent: Agent<Env>,
    private knowledgeBase: KnowledgeBase<Env>
  ) {}

  /**
   * Extract knowledge from a conversation
   * @param conversation The conversation text
   * @param context Additional context about the conversation
   * @returns Array of extracted knowledge items
   */
  async extractFromConversation(
    conversation: string,
    context: {
      userId: string;
      timestamp: number;
      topic?: string;
    }
  ): Promise<ExtractedKnowledge[]> {
    // In a real implementation, we would use an LLM to extract knowledge
    // For now, we'll use a simple rule-based approach as a placeholder
    
    const extractedKnowledge: ExtractedKnowledge[] = [];
    
    // Simple pattern matching for facts (very basic implementation)
    // Look for patterns like "X is Y" or "X are Y"
    const factPatterns = [
      /([^.!?]+) is ([^.!?]+)/g,
      /([^.!?]+) are ([^.!?]+)/g,
      /([^.!?]+) was ([^.!?]+)/g,
      /([^.!?]+) were ([^.!?]+)/g
    ];
    
    for (const pattern of factPatterns) {
      let match;
      while ((match = pattern.exec(conversation)) !== null) {
        const subject = match[1].trim();
        const predicate = match[2].trim();
        
        // Skip common conversational phrases
        if (this.isCommonPhrase(subject)) continue;
        
        // Create a fact
        const fact = `${subject} ${pattern.source.includes(' is ') ? 'is' : 'are'} ${predicate}`;
        
        // Determine category based on subject
        const category = this.determineCategory(subject);
        
        // Extract potential tags
        const tags = this.extractTags(subject, predicate);
        
        extractedKnowledge.push({
          fact,
          confidence: 0.7, // Medium confidence for rule-based extraction
          source: `conversation:${context.userId}:${context.timestamp}`,
          category,
          tags
        });
      }
    }
    
    // Store the extracted knowledge in the knowledge base
    for (const knowledge of extractedKnowledge) {
      await this.knowledgeBase.storeKnowledge({
        content: knowledge.fact,
        source: knowledge.source,
        category: knowledge.category,
        tags: knowledge.tags,
        confidence: knowledge.confidence
      });
    }
    
    return extractedKnowledge;
  }

  /**
   * Extract knowledge from a document
   * @param document The document text
   * @param metadata Document metadata
   * @returns Array of extracted knowledge items
   */
  async extractFromDocument(
    document: string,
    metadata: {
      title: string;
      source: string;
      author?: string;
      date?: string;
      category?: string;
    }
  ): Promise<ExtractedKnowledge[]> {
    // In a real implementation, we would use an LLM to extract knowledge
    // For now, we'll return a placeholder implementation
    
    const extractedKnowledge: ExtractedKnowledge[] = [];
    
    // Split document into sentences
    const sentences = document.match(/[^.!?]+[.!?]+/g) || [];
    
    for (const sentence of sentences) {
      // Skip short sentences
      if (sentence.length < 20) continue;
      
      // For longer, potentially information-rich sentences, extract as facts
      if (sentence.length > 50) {
        const category = metadata.category || this.determineCategory(sentence);
        const tags = this.extractTags(sentence, metadata.title);
        
        extractedKnowledge.push({
          fact: sentence.trim(),
          confidence: 0.6, // Lower confidence for sentence extraction
          source: metadata.source,
          category,
          tags
        });
      }
    }
    
    // Store the extracted knowledge in the knowledge base
    for (const knowledge of extractedKnowledge) {
      await this.knowledgeBase.storeKnowledge({
        content: knowledge.fact,
        source: knowledge.source,
        category: knowledge.category,
        tags: knowledge.tags,
        confidence: knowledge.confidence,
        metadata: {
          title: metadata.title,
          author: metadata.author,
          date: metadata.date
        }
      });
    }
    
    return extractedKnowledge;
  }

  /**
   * Extract knowledge using an LLM
   * @param text The text to extract knowledge from
   * @param context Additional context
   * @returns Array of extracted knowledge items
   */
  async extractWithLLM(
    text: string,
    context: {
      source: string;
      category?: string;
      prompt?: string;
    }
  ): Promise<ExtractedKnowledge[]> {
    // In a real implementation, we would call an LLM API
    // For now, we'll return a placeholder
    
    console.log("Extracting knowledge with LLM from text:", text.substring(0, 100) + "...");
    
    // This would be replaced with actual LLM call
    const mockExtractedKnowledge: ExtractedKnowledge[] = [
      {
        fact: "This is a placeholder for LLM-extracted knowledge",
        confidence: 0.8,
        source: context.source,
        category: context.category || "general",
        tags: ["placeholder", "llm"]
      }
    ];
    
    // Store the extracted knowledge in the knowledge base
    for (const knowledge of mockExtractedKnowledge) {
      await this.knowledgeBase.storeKnowledge({
        content: knowledge.fact,
        source: knowledge.source,
        category: knowledge.category,
        tags: knowledge.tags,
        confidence: knowledge.confidence
      });
    }
    
    return mockExtractedKnowledge;
  }

  /**
   * Check if a phrase is a common conversational phrase
   * @param phrase The phrase to check
   * @returns Whether the phrase is common
   */
  private isCommonPhrase(phrase: string): boolean {
    const commonPhrases = [
      "it", "that", "this", "there", "here", "what", "how", "why",
      "the problem", "the issue", "the question", "the answer",
      "my name", "your name", "my question", "your question"
    ];
    
    return commonPhrases.some(common => 
      phrase.toLowerCase().includes(common.toLowerCase())
    );
  }

  /**
   * Determine the category for a piece of knowledge
   * @param text The text to categorize
   * @returns The determined category
   */
  private determineCategory(text: string): string {
    const categoryPatterns = [
      { pattern: /\b(weather|temperature|climate|forecast)\b/i, category: "weather" },
      { pattern: /\b(schedule|calendar|appointment|meeting|event)\b/i, category: "calendar" },
      { pattern: /\b(email|message|send|inbox|outbox)\b/i, category: "email" },
      { pattern: /\b(person|people|user|name|contact)\b/i, category: "people" },
      { pattern: /\b(location|place|city|country|address)\b/i, category: "location" },
      { pattern: /\b(time|date|day|month|year)\b/i, category: "time" },
      { pattern: /\b(preference|setting|configuration|option)\b/i, category: "preferences" }
    ];
    
    for (const { pattern, category } of categoryPatterns) {
      if (pattern.test(text)) {
        return category;
      }
    }
    
    return "general";
  }

  /**
   * Extract tags from text
   * @param text The text to extract tags from
   * @param additionalText Additional text to consider
   * @returns Array of extracted tags
   */
  private extractTags(text: string, additionalText: string = ""): string[] {
    const combinedText = `${text} ${additionalText}`;
    const words = combinedText.toLowerCase().match(/\b\w{3,}\b/g) || [];
    
    // Filter out common words
    const commonWords = [
      "the", "and", "that", "have", "for", "not", "with", "you", "this",
      "but", "his", "from", "they", "say", "her", "she", "will", "one",
      "all", "would", "there", "their", "what", "out", "about", "who",
      "get", "which", "when", "make", "can", "like", "time", "just", "him",
      "know", "take", "people", "into", "year", "your", "good", "some",
      "could", "them", "see", "other", "than", "then", "now", "look",
      "only", "come", "its", "over", "think", "also", "back", "after",
      "use", "two", "how", "our", "work", "first", "well", "way", "even",
      "new", "want", "because", "any", "these", "give", "day", "most", "are"
    ];
    
    // Get unique words that aren't common
    const uniqueWords = [...new Set(words)].filter(
      word => !commonWords.includes(word)
    );
    
    // Limit to 5 tags
    return uniqueWords.slice(0, 5);
  }

  /**
   * Process a batch of conversations to extract knowledge
   * @param conversations Array of conversations to process
   * @returns Number of knowledge items extracted
   */
  async processBatchConversations(
    conversations: Array<{
      text: string;
      userId: string;
      timestamp: number;
      topic?: string;
    }>
  ): Promise<number> {
    let totalExtracted = 0;
    
    for (const conversation of conversations) {
      const extracted = await this.extractFromConversation(
        conversation.text,
        {
          userId: conversation.userId,
          timestamp: conversation.timestamp,
          topic: conversation.topic
        }
      );
      
      totalExtracted += extracted.length;
    }
    
    return totalExtracted;
  }

  /**
   * Process a batch of documents to extract knowledge
   * @param documents Array of documents to process
   * @returns Number of knowledge items extracted
   */
  async processBatchDocuments(
    documents: Array<{
      text: string;
      title: string;
      source: string;
      author?: string;
      date?: string;
      category?: string;
    }>
  ): Promise<number> {
    let totalExtracted = 0;
    
    for (const document of documents) {
      const extracted = await this.extractFromDocument(
        document.text,
        {
          title: document.title,
          source: document.source,
          author: document.author,
          date: document.date,
          category: document.category
        }
      );
      
      totalExtracted += extracted.length;
    }
    
    return totalExtracted;
  }
}
