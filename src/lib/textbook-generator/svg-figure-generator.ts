/**
 * SVG Figure Generator for Aptitude Tests
 * 
 * Generates exam-style figures programmatically without AI image generation.
 * Supports: Shape series, pattern recognition, mirror images, rotations, etc.
 */

// ============================================
// TYPES
// ============================================

export type ShapeType =
    | 'circle'
    | 'square'
    | 'triangle'
    | 'pentagon'
    | 'hexagon'
    | 'star'
    | 'arrow'
    | 'diamond'
    | 'cross'
    | 'plus'
    | 'question_mark';

export type PatternType =
    | 'series'           // Shape sequence (A, B, C, ?)
    | 'rotation'         // Same shape rotated
    | 'mirror'           // Mirror image comparison
    | 'odd_one_out'      // Find the different one
    | 'grid'             // 3x3 grid pattern
    | 'counting';        // Count shapes in complex figure

export interface ShapeConfig {
    shape: ShapeType;
    fill?: 'black' | 'white' | 'gray' | 'none';
    stroke?: 'black' | 'gray';
    rotation?: number;        // Degrees
    scale?: number;           // 0.5 to 2.0
    innerShape?: ShapeType;   // Nested shape
    innerFill?: 'black' | 'white' | 'gray' | 'none';
    dots?: number;            // Number of dots inside
    lines?: number;           // Number of lines inside
    label?: string;           // Text label (A, B, 1, 2, ?)
}

export interface FigureSpec {
    type: PatternType;
    figures: ShapeConfig[];
    columns?: number;         // For grid layout
    title?: string;           // Question text
    showQuestionMark?: boolean;
}

// ============================================
// SVG PRIMITIVES
// ============================================

const SVG_SIZE = 80;  // Size of each shape cell
const PADDING = 10;
const SHAPE_SIZE = 50;

function getShapeSVG(config: ShapeConfig, cx: number, cy: number): string {
    const {
        shape,
        fill = 'none',
        stroke = 'black',
        rotation = 0,
        scale = 1,
        innerShape,
        innerFill = 'black',
        dots = 0,
        lines = 0,
        label
    } = config;

    const size = SHAPE_SIZE * scale;
    const halfSize = size / 2;
    const transform = rotation ? `transform="rotate(${rotation}, ${cx}, ${cy})"` : '';

    let shapeSvg = '';
    const strokeWidth = 2;
    const fillColor = fill === 'none' ? 'none' : fill;
    const strokeColor = stroke;

    // Handle question mark specially
    if (shape === 'question_mark') {
        return `
            <text x="${cx}" y="${cy + 10}" 
                  font-size="40" 
                  font-weight="bold" 
                  text-anchor="middle" 
                  fill="black">?</text>
        `;
    }

    switch (shape) {
        case 'circle':
            shapeSvg = `<circle cx="${cx}" cy="${cy}" r="${halfSize}" 
                         fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" 
                         ${transform}/>`;
            break;

        case 'square':
            shapeSvg = `<rect x="${cx - halfSize}" y="${cy - halfSize}" 
                         width="${size}" height="${size}" 
                         fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" 
                         ${transform}/>`;
            break;

        case 'triangle':
            const triPoints = [
                `${cx},${cy - halfSize}`,           // Top
                `${cx - halfSize},${cy + halfSize * 0.7}`, // Bottom left
                `${cx + halfSize},${cy + halfSize * 0.7}`  // Bottom right
            ].join(' ');
            shapeSvg = `<polygon points="${triPoints}" 
                         fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" 
                         ${transform}/>`;
            break;

        case 'diamond':
            const diamondPoints = [
                `${cx},${cy - halfSize}`,    // Top
                `${cx + halfSize},${cy}`,    // Right
                `${cx},${cy + halfSize}`,    // Bottom
                `${cx - halfSize},${cy}`     // Left
            ].join(' ');
            shapeSvg = `<polygon points="${diamondPoints}" 
                         fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" 
                         ${transform}/>`;
            break;

        case 'pentagon':
            const pentPoints = generatePolygonPoints(cx, cy, halfSize, 5);
            shapeSvg = `<polygon points="${pentPoints}" 
                         fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" 
                         ${transform}/>`;
            break;

        case 'hexagon':
            const hexPoints = generatePolygonPoints(cx, cy, halfSize, 6);
            shapeSvg = `<polygon points="${hexPoints}" 
                         fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" 
                         ${transform}/>`;
            break;

        case 'star':
            const starPoints = generateStarPoints(cx, cy, halfSize, halfSize * 0.5, 5);
            shapeSvg = `<polygon points="${starPoints}" 
                         fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" 
                         ${transform}/>`;
            break;

        case 'arrow':
            // Right-pointing arrow
            const arrowPoints = [
                `${cx - halfSize},${cy - halfSize * 0.4}`,  // Top left
                `${cx},${cy - halfSize * 0.4}`,             // Top middle
                `${cx},${cy - halfSize * 0.7}`,             // Top arrow notch
                `${cx + halfSize},${cy}`,                   // Right point
                `${cx},${cy + halfSize * 0.7}`,             // Bottom arrow notch
                `${cx},${cy + halfSize * 0.4}`,             // Bottom middle
                `${cx - halfSize},${cy + halfSize * 0.4}`   // Bottom left
            ].join(' ');
            shapeSvg = `<polygon points="${arrowPoints}" 
                         fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" 
                         ${transform}/>`;
            break;

        case 'cross':
            // X shape
            const crossWidth = size * 0.25;
            shapeSvg = `
                <line x1="${cx - halfSize}" y1="${cy - halfSize}" 
                      x2="${cx + halfSize}" y2="${cy + halfSize}" 
                      stroke="${strokeColor}" stroke-width="${crossWidth}" ${transform}/>
                <line x1="${cx + halfSize}" y1="${cy - halfSize}" 
                      x2="${cx - halfSize}" y2="${cy + halfSize}" 
                      stroke="${strokeColor}" stroke-width="${crossWidth}" ${transform}/>
            `;
            break;

        case 'plus':
            // + shape
            const plusWidth = size * 0.25;
            shapeSvg = `
                <line x1="${cx}" y1="${cy - halfSize}" 
                      x2="${cx}" y2="${cy + halfSize}" 
                      stroke="${strokeColor}" stroke-width="${plusWidth}" ${transform}/>
                <line x1="${cx - halfSize}" y1="${cy}" 
                      x2="${cx + halfSize}" y2="${cy}" 
                      stroke="${strokeColor}" stroke-width="${plusWidth}" ${transform}/>
            `;
            break;

        default:
            shapeSvg = `<circle cx="${cx}" cy="${cy}" r="${halfSize}" 
                         fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
    }

    // Add inner shape if specified
    if (innerShape && innerShape !== 'question_mark') {
        const innerConfig: ShapeConfig = {
            shape: innerShape,
            fill: innerFill,
            stroke: stroke,
            scale: 0.4
        };
        shapeSvg += getShapeSVG(innerConfig, cx, cy);
    }

    // Add dots inside
    if (dots > 0) {
        shapeSvg += generateDots(cx, cy, halfSize * 0.5, dots);
    }

    // Add lines inside
    if (lines > 0) {
        shapeSvg += generateLines(cx, cy, halfSize * 0.6, lines);
    }

    // Add label below shape
    if (label) {
        shapeSvg += `<text x="${cx}" y="${cy + halfSize + 15}" 
                      font-size="14" text-anchor="middle" fill="black">${label}</text>`;
    }

    return shapeSvg;
}

function generatePolygonPoints(cx: number, cy: number, radius: number, sides: number): string {
    const points: string[] = [];
    const angleOffset = -Math.PI / 2; // Start from top

    for (let i = 0; i < sides; i++) {
        const angle = angleOffset + (2 * Math.PI * i) / sides;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        points.push(`${x},${y}`);
    }

    return points.join(' ');
}

function generateStarPoints(cx: number, cy: number, outerRadius: number, innerRadius: number, points: number): string {
    const result: string[] = [];
    const angleOffset = -Math.PI / 2;

    for (let i = 0; i < points * 2; i++) {
        const angle = angleOffset + (Math.PI * i) / points;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        result.push(`${x},${y}`);
    }

    return result.join(' ');
}

function generateDots(cx: number, cy: number, radius: number, count: number): string {
    let dots = '';
    const dotRadius = 3;

    if (count === 1) {
        dots = `<circle cx="${cx}" cy="${cy}" r="${dotRadius}" fill="black"/>`;
    } else {
        for (let i = 0; i < count; i++) {
            const angle = (2 * Math.PI * i) / count - Math.PI / 2;
            const x = cx + radius * 0.6 * Math.cos(angle);
            const y = cy + radius * 0.6 * Math.sin(angle);
            dots += `<circle cx="${x}" cy="${y}" r="${dotRadius}" fill="black"/>`;
        }
    }

    return dots;
}

function generateLines(cx: number, cy: number, length: number, count: number): string {
    let lines = '';

    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * i) / count;
        const x1 = cx - length * Math.cos(angle);
        const y1 = cy - length * Math.sin(angle);
        const x2 = cx + length * Math.cos(angle);
        const y2 = cy + length * Math.sin(angle);
        lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
                   stroke="black" stroke-width="2"/>`;
    }

    return lines;
}

// ============================================
// FIGURE GENERATORS
// ============================================

export function generateFigureSVG(spec: FigureSpec): string {
    const { type, figures, columns = figures.length, title } = spec;

    const rows = Math.ceil(figures.length / columns);
    const width = columns * SVG_SIZE + PADDING * 2;
    const height = rows * SVG_SIZE + PADDING * 2 + (title ? 30 : 0);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" 
                    width="${width}" height="${height}" 
                    viewBox="0 0 ${width} ${height}"
                    style="background: white;">`;

    // Add title if present
    if (title) {
        svg += `<text x="${width / 2}" y="20" 
                 font-size="14" text-anchor="middle" fill="black">${title}</text>`;
    }

    const yOffset = title ? 30 : 0;

    // Draw each figure in grid
    figures.forEach((fig, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const cx = PADDING + col * SVG_SIZE + SVG_SIZE / 2;
        const cy = yOffset + PADDING + row * SVG_SIZE + SVG_SIZE / 2;

        // Add cell border
        svg += `<rect x="${PADDING + col * SVG_SIZE}" y="${yOffset + PADDING + row * SVG_SIZE}" 
                 width="${SVG_SIZE}" height="${SVG_SIZE}" 
                 fill="none" stroke="#ddd" stroke-width="1"/>`;

        // Add shape
        svg += getShapeSVG(fig, cx, cy);
    });

    svg += '</svg>';
    return svg;
}

/**
 * Generate a series figure (A → B → C → ?)
 */
export function generateSeriesFigure(shapes: ShapeConfig[], showLabels = true): string {
    const figuresWithLabels = shapes.map((shape, i) => ({
        ...shape,
        label: showLabels ? (i === shapes.length - 1 && shape.shape === 'question_mark' ? '?' : String.fromCharCode(65 + i)) : undefined
    }));

    return generateFigureSVG({
        type: 'series',
        figures: figuresWithLabels,
        columns: figuresWithLabels.length
    });
}

/**
 * Generate rotation sequence (same shape rotated progressively)
 */
export function generateRotationFigure(baseShape: ShapeConfig, rotations: number[]): string {
    const figures = rotations.map((rotation, i) => ({
        ...baseShape,
        rotation,
        label: String.fromCharCode(65 + i)
    }));

    return generateFigureSVG({
        type: 'rotation',
        figures,
        columns: figures.length
    });
}

/**
 * Generate odd-one-out figure
 */
export function generateOddOneOut(shapes: ShapeConfig[]): string {
    const figures = shapes.map((shape, i) => ({
        ...shape,
        label: String.fromCharCode(65 + i)
    }));

    return generateFigureSVG({
        type: 'odd_one_out',
        figures,
        columns: figures.length
    });
}

/**
 * Generate a 3x3 grid pattern with one missing
 */
export function generateGridPattern(shapes: ShapeConfig[]): string {
    // Ensure 9 items, last one should be question_mark
    while (shapes.length < 9) {
        shapes.push({ shape: 'question_mark' });
    }

    return generateFigureSVG({
        type: 'grid',
        figures: shapes.slice(0, 9),
        columns: 3
    });
}

// ============================================
// CONVERSION UTILITIES
// ============================================

/**
 * Convert SVG to Data URL (for embedding in HTML/PDF)
 */
export function svgToDataUrl(svg: string): string {
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Parse a figure spec from AI output and generate SVG
 */
export function parseFigureSpec(specJson: string): string | null {
    try {
        const spec = JSON.parse(specJson) as FigureSpec;
        return generateFigureSVG(spec);
    } catch (error) {
        console.error('[SVG-GEN] Failed to parse figure spec:', error);
        return null;
    }
}

// ============================================
// PRESET GENERATORS (Common patterns)
// ============================================

export const PRESETS = {
    // Basic shape series
    shapeProgression: () => generateSeriesFigure([
        { shape: 'circle', fill: 'black' },
        { shape: 'square', fill: 'black' },
        { shape: 'triangle', fill: 'black' },
        { shape: 'question_mark' }
    ]),

    // Rotation series
    arrowRotation: () => generateRotationFigure(
        { shape: 'arrow', fill: 'black' },
        [0, 90, 180, 270]
    ),

    // Fill pattern
    fillPattern: () => generateSeriesFigure([
        { shape: 'circle', fill: 'black' },
        { shape: 'circle', fill: 'gray' },
        { shape: 'circle', fill: 'white', stroke: 'black' },
        { shape: 'question_mark' }
    ]),

    // Nested shapes
    nestedShapes: () => generateSeriesFigure([
        { shape: 'circle', fill: 'none', innerShape: 'square', innerFill: 'black' },
        { shape: 'square', fill: 'none', innerShape: 'triangle', innerFill: 'black' },
        { shape: 'triangle', fill: 'none', innerShape: 'circle', innerFill: 'black' },
        { shape: 'question_mark' }
    ]),

    // Dot counting
    dotProgression: () => generateSeriesFigure([
        { shape: 'circle', fill: 'none', dots: 1 },
        { shape: 'circle', fill: 'none', dots: 2 },
        { shape: 'circle', fill: 'none', dots: 3 },
        { shape: 'question_mark' }
    ]),
};

// Export default for convenience
export default {
    generateFigureSVG,
    generateSeriesFigure,
    generateRotationFigure,
    generateOddOneOut,
    generateGridPattern,
    svgToDataUrl,
    parseFigureSpec,
    PRESETS
};
