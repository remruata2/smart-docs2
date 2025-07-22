/**
 * Enhanced HTML to Markdown converter using Turndown
 * with special handling for complex tables
 */

import TurndownService from 'turndown';

/**
 * Process HTML tables directly to create properly formatted markdown tables
 * @param html - HTML content containing tables
 * @returns HTML with tables replaced by markdown tables
 */
function processTablesDirectly(html: string): string {
  // Create a DOM parser to work with the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  
  // If no tables, return the original HTML
  if (tables.length === 0) return html;
  
  // Process each table
  tables.forEach((table) => {
    // Create a markdown table
    const markdownTable = convertTableToMarkdown(table);
    
    // Replace the table with a placeholder div containing the markdown
    const placeholder = doc.createElement('div');
    placeholder.setAttribute('class', 'markdown-table-placeholder');
    placeholder.textContent = markdownTable;
    table.parentNode?.replaceChild(placeholder, table);
  });
  
  return doc.body.innerHTML;
}

/**
 * Convert a table element to markdown
 * @param table - HTML table element
 * @returns Markdown table string
 */
function convertTableToMarkdown(table: HTMLTableElement): string {
  const rows = Array.from(table.rows);
  const markdownRows: string[] = [];
  
  // Determine if the table has a caption/title
  const caption = table.querySelector('caption');
  if (caption && caption.textContent?.trim()) {
    markdownRows.push(`# ${caption.textContent.trim()}`);
    markdownRows.push('');
  }
  
  // Process rows
  let headerProcessed = false;
  
  rows.forEach((row, rowIndex) => {
    const cells = Array.from(row.cells);
    const rowContent: string[] = [];
    
    // Skip empty rows
    if (cells.length === 0) return;
    
    // Process cells
    cells.forEach((cell) => {
      const content = cell.textContent?.trim() || '';
      const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
      
      // Handle colspan by repeating the content or using empty cells
      if (colspan > 1) {
        rowContent.push(` ${content} |${'|'.repeat(colspan - 1)}`);
      } else {
        rowContent.push(` ${content} `);
      }
    });
    
    // Add the row
    markdownRows.push(`|${rowContent.join('|')}|`);
    
    // Add header separator after the first row with cells
    // or after a row with th elements
    const hasHeaderCells = Array.from(row.cells).some(cell => cell.tagName.toLowerCase() === 'th');
    
    if (!headerProcessed && (rowIndex === 0 || hasHeaderCells)) {
      const separators = cells.map(() => ' --- ');
      markdownRows.push(`|${separators.join('|')}|`);
      headerProcessed = true;
    }
  });
  
  return markdownRows.join('\n');
}

/**
 * Configure Turndown service with optimal options for better markdown output
 * @returns Configured turndown service instance
 */
export function createConfiguredTurndownService(): TurndownService {
  // Create a new Turndown service with optimal options
  const turndownService = new TurndownService({
    headingStyle: 'atx',           // Use # style headings
    hr: '---',                     // Use --- for horizontal rules
    bulletListMarker: '-',         // Use - for bullet lists
    codeBlockStyle: 'fenced',      // Use ``` style code blocks
    emDelimiter: '*',              // Use * for emphasis
    strongDelimiter: '**',         // Use ** for strong emphasis
    linkStyle: 'inlined',          // Use inline links
    linkReferenceStyle: 'full',    // Use full references for links
    preformattedCode: true         // Preserve formatting in code blocks
  });
  
  // Add rule for preserving line breaks
  turndownService.addRule('lineBreaks', {
    filter: 'br',
    replacement: function() {
      return '  \n';
    }
  });
  
  // Disable the default table rules since we're handling tables separately
  turndownService.remove('table');
  turndownService.remove('tableRow');
  turndownService.remove('tableCell');
  
  // Add a special rule for our table placeholders
  turndownService.addRule('markdownTablePlaceholder', {
    filter: (node: HTMLElement) => {
      return (
        node.nodeName === 'DIV' &&
        node.className === 'markdown-table-placeholder'
      );
    },
    replacement: (content: string) => content
  });

  return turndownService;
}

/**
 * Converts HTML content to Markdown using configured Turndown
 * with special handling for tables
 * @param html - HTML content to convert
 * @returns Markdown content
 */
export function convertHtmlToMarkdown(html: string): string {
  // First process tables directly
  const htmlWithProcessedTables = processTablesDirectly(html);
  
  // Then use Turndown for the rest of the content
  const turndownService = createConfiguredTurndownService();
  return turndownService.turndown(htmlWithProcessedTables);
}
