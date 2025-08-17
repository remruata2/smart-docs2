const fs = require('fs');
const TurndownService = require('turndown');

// Configure Turndown for better table handling
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
});

// Custom rule for better table formatting
turndownService.addRule('table', {
  filter: 'table',
  replacement: function (content, node) {
    const rows = Array.from(node.querySelectorAll('tr'));
    let markdown = '\n';
    
    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      const cellContents = cells.map(cell => {
        return cell.textContent.trim().replace(/\s+/g, ' ');
      });
      
      // Create table row
      markdown += '| ' + cellContents.join(' | ') + ' |\n';
      
      // Add header separator for first row
      if (rowIndex === 0) {
        markdown += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
      }
    });
    
    return markdown + '\n';
  }
});

// Custom rule to clean up excessive whitespace and empty paragraphs
turndownService.addRule('cleanParagraphs', {
  filter: 'p',
  replacement: function (content, node) {
    const text = content.trim();
    if (!text || text === '&nbsp;') {
      return '';
    }
    return '\n\n' + text + '\n\n';
  }
});

// Function to convert HTML file to Markdown
function convertHtmlToMarkdown(inputPath, outputPath) {
  try {
    console.log(`Reading HTML file: ${inputPath}`);
    const htmlContent = fs.readFileSync(inputPath, 'utf-8');
    
    console.log('Converting HTML to Markdown...');
    const markdown = turndownService.turndown(htmlContent);
    
    // Clean up excessive newlines and whitespace
    const cleanedMarkdown = markdown
      .replace(/\n{3,}/g, '\n\n')  // Replace 3+ newlines with 2
      .replace(/^\s+|\s+$/gm, '')  // Trim whitespace from start/end of lines
      .replace(/^[\s\n]*|[\s\n]*$/g, '')  // Trim from start/end of file
      .split('\n')
      .filter(line => line.trim() !== '')  // Remove completely empty lines
      .join('\n')
      .replace(/\n(?=\n)/g, '')  // Remove single empty lines between content
      .replace(/\n/g, '\n\n');  // Add consistent double spacing
    
    console.log('Writing Markdown file...');
    fs.writeFileSync(outputPath, cleanedMarkdown, 'utf-8');
    
    console.log(`✅ Successfully converted HTML to Markdown!`);
    console.log(`📄 Input: ${inputPath}`);
    console.log(`📄 Output: ${outputPath}`);
    
    // Show file sizes
    const originalSize = fs.statSync(inputPath).size;
    const convertedSize = fs.statSync(outputPath).size;
    console.log(`📊 Original size: ${originalSize} bytes`);
    console.log(`📊 Converted size: ${convertedSize} bytes`);
    
  } catch (error) {
    console.error('❌ Error converting file:', error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
let inputFile = '494.html';
let outputFile = '494.md';

if (args.length >= 1) {
  inputFile = args[0];
}
if (args.length >= 2) {
  outputFile = args[1];
}

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`❌ Input file not found: ${inputFile}`);
  process.exit(1);
}

console.log('🚀 HTML to Markdown Converter');
console.log('==============================');

convertHtmlToMarkdown(inputFile, outputFile);
