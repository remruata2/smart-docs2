const fs = require('fs');
const { JSDOM } = require('jsdom');

// Function to extract text content cleanly
function getCleanText(element) {
  return element.textContent.trim().replace(/\s+/g, ' ');
}

// Function to process HTML and extract structured data
function processHTML(htmlContent) {
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;
  
  const sections = [];
  let currentSection = null;
  
  // Find all elements in order
  const allElements = document.querySelectorAll('p, table');
  
  allElements.forEach(element => {
    if (element.tagName === 'P') {
      const text = getCleanText(element);
      
      // Check if this is a heading (contains specific keywords and is in strong/bold)
      if (text && (text.includes('JOB CARD') || text.includes('RATION CARD')) && 
          (element.querySelector('strong') || element.querySelector('span[style*="font-weight"]'))) {
        
        // Save previous section if exists
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: text,
          rows: []
        };
      }
    } else if (element.tagName === 'TABLE' && currentSection) {
      // Process table rows
      const rows = element.querySelectorAll('tr');
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length === 3) {
          const rowData = Array.from(cells).map(cell => getCleanText(cell));
          
          // Skip empty rows
          if (rowData.some(cell => cell && cell !== '&nbsp;')) {
            currentSection.rows.push(rowData);
          }
        }
      });
    }
  });
  
  // Add final section
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
}

// Function to convert sections to markdown
function sectionsToMarkdown(sections) {
  let markdown = '';
  
  sections.forEach((section, index) => {
    if (index > 0) markdown += '\n\n';
    
    // Add section heading
    markdown += `**${section.title}**\n\n`;
    
    // Add table
    if (section.rows.length > 0) {
      // Add empty header row for proper table structure
      markdown += '|     |     |     |\n';
      markdown += '| --- | --- | --- |\n';
      
      // Add all rows
      section.rows.forEach(row => {
        const cleanRow = row.map(cell => cell || '').map(cell => {
          // Pad numbers for better alignment
          if (/^\d+$/.test(cell) && cell.length < 3) {
            return cell.padEnd(3);
          }
          return cell;
        });
        markdown += `| ${cleanRow.join(' | ')} |\n`;
      });
    }
  });
  
  return markdown.trim();
}

// Function to convert HTML file to Markdown
function convertHtmlToMarkdown(inputPath, outputPath) {
  try {
    console.log(`Reading HTML file: ${inputPath}`);
    const htmlContent = fs.readFileSync(inputPath, 'utf-8');
    
    console.log('Processing HTML structure...');
    const sections = processHTML(htmlContent);
    
    console.log('Converting to Markdown...');
    const markdown = sectionsToMarkdown(sections);
    
    console.log('Writing Markdown file...');
    fs.writeFileSync(outputPath, markdown, 'utf-8');
    
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
let outputFile = '494-ideal.md';

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

console.log('🚀 HTML to Markdown Converter - Improved');
console.log('========================================');

convertHtmlToMarkdown(inputFile, outputFile);
