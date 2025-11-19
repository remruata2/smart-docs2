/**
 * Input Sanitization for AI Prompts
 * 
 * Prevents prompt injection attacks and ensures safe input to AI models
 */

export interface SanitizationResult {
  sanitized: string;
  wasModified: boolean;
  removedPatterns: string[];
}

/**
 * Sanitize user input before sending to AI
 * Removes potentially malicious patterns while preserving legitimate queries
 */
export function sanitizeAIInput(input: string, maxLength: number = 1000): SanitizationResult {
  const removedPatterns: string[] = [];
  let sanitized = input;
  const original = input;

  // 1. Enforce max length first
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
    removedPatterns.push('length_exceeded');
  }

  // 2. Remove control characters except newlines and tabs
  const beforeControl = sanitized;
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  if (beforeControl !== sanitized) removedPatterns.push('control_characters');

  // 3. Detect and neutralize common prompt injection patterns
  const injectionPatterns = [
    /ignore\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions?|prompts?|rules?)/gi,
    /disregard\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions?|prompts?)/gi,
    /you\s+are\s+now\s+(?:a\s+)?(?:different|new)/gi,
    /act\s+as\s+(?:a\s+)?(?:different|new)/gi,
    /pretend\s+(?:you\s+are|to\s+be)/gi,
    /system\s*:?\s*(?:override|bypass|ignore)/gi,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
      removedPatterns.push('injection_attempt');
    }
  }

  // 4. Limit consecutive special characters (potential encoding attacks)
  const beforeSpecial = sanitized;
  sanitized = sanitized.replace(/([\\'"`;{}[\]()<>]){3,}/g, '$1$1');
  if (beforeSpecial !== sanitized) removedPatterns.push('excessive_special_chars');

  // 5. Remove potential SQL injection patterns (extra safety layer)
  const sqlPatterns = [
    /;\s*(?:drop|delete|truncate|alter|create)\s+(?:table|database)/gi,
    /union\s+(?:all\s+)?select/gi,
    /(?:exec|execute)\s*\(/gi,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
      removedPatterns.push('sql_injection_attempt');
    }
  }

  // 6. Limit multiple newlines
  sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n');

  return {
    sanitized: sanitized.trim(),
    wasModified: original !== sanitized,
    removedPatterns,
  };
}

/**
 * Validate conversation history message
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  timestamp?: Date | string;
}

export function validateConversationHistory(
  history: any[],
  maxLength: number = 20,
  maxMessageLength: number = 1000
): { valid: boolean; error?: string; sanitized?: ConversationMessage[] } {
  if (!Array.isArray(history)) {
    return { valid: false, error: 'conversationHistory must be an array' };
  }

  if (history.length > maxLength) {
    return {
      valid: false,
      error: `conversationHistory too long (max ${maxLength} messages)`,
    };
  }

  const sanitized: ConversationMessage[] = [];

  for (let i = 0; i < history.length; i++) {
    const msg = history[i];

    // Validate structure
    if (typeof msg !== 'object' || msg === null) {
      return { valid: false, error: `Message ${i} is not an object` };
    }

    // Validate role
    if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
      return { valid: false, error: `Message ${i} has invalid role` };
    }

    // Validate content
    if (!msg.content || typeof msg.content !== 'string') {
      return { valid: false, error: `Message ${i} has invalid content` };
    }

    // Only apply length limit to user messages (assistant messages can be long)
    if (msg.role === 'user' && msg.content.length > maxMessageLength) {
      return {
        valid: false,
        error: `Message ${i} content too long (max ${maxMessageLength} characters)`,
      };
    }

    // Sanitize content
    const sanitizationResult = sanitizeAIInput(msg.content, maxMessageLength);

    sanitized.push({
      role: msg.role,
      content: sanitizationResult.sanitized,
      id: typeof msg.id === 'string' ? msg.id : undefined,
      timestamp: msg.timestamp,
    });
  }

  return { valid: true, sanitized };
}

/**
 * Sanitize filter values (category)
 */
export function sanitizeFilterValue(value: string): string {
  return value
    .trim()
    .replace(/[<>'"`;\\]/g, '') // Remove potentially dangerous characters
    .slice(0, 100); // Limit length
}

