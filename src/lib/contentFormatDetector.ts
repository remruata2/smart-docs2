/**
 * Utility for detecting and rendering different content formats
 */

/**
 * Detects if content is likely HTML based on common HTML patterns
 * @param content - The content to check
 * @returns boolean indicating if content appears to be HTML
 */
export function isHtmlContent(content: string): boolean {
  // Check for common HTML tags
  const htmlTagPattern = /<\/?(?:div|p|span|h[1-6]|ul|ol|li|table|tr|td|th|a|img|br|hr|strong|em|b|i|code|pre)[^>]*>/i;
  
  // Check for HTML entities
  const htmlEntityPattern = /&[a-z]+;|&#[0-9]+;/i;
  
  // Check for style attributes
  const stylePattern = /style\s*=\s*["'][^"']*["']/i;
  
  // If any of these patterns match, it's likely HTML
  return (
    htmlTagPattern.test(content) || 
    htmlEntityPattern.test(content) ||
    stylePattern.test(content)
  );
}

/**
 * Renders content based on its format (HTML or Markdown)
 * This function is meant to be used with a React component
 * 
 * @param content - The content to render
 * @param format - Optional explicit format ('html' or 'markdown')
 * @returns Object with rendering properties
 */
export function getContentRenderProps(content: string, format?: 'html' | 'markdown') {
  // If format is explicitly provided, use it
  // Otherwise detect format from content
  const isHtml = format === 'html' || (format !== 'markdown' && isHtmlContent(content));
  
  return {
    isHtml,
    // For React components that need to know how to render
    dangerouslySetInnerHTML: isHtml ? { __html: content } : undefined,
    // For components that need the raw content (if not HTML)
    markdownContent: isHtml ? undefined : content,
  };
}
