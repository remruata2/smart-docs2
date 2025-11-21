"use client";

import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { ChartConfig } from '@/lib/chart-schema';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileImage, FileText, FileSpreadsheet, FileType, FileCode } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRef } from 'react';

export function SmartChart({ config }: { config: ChartConfig }) {
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]; // Blue, Green, Amber, Red, Purple, Pink
    const chartContainerRef = useRef<HTMLDivElement>(null);

    console.log("[SmartChart] Rendering with config:", config);

    // Validate config
    if (!config) {
        console.error("[SmartChart] No config provided");
        return <div className="text-red-500 p-4">Error: No chart configuration provided</div>;
    }

    // Ensure data is an array (it might be a string that needs parsing)
    let chartData = config.data;
    if (typeof chartData === "string") {
        try {
            chartData = JSON.parse(chartData);
        } catch (e) {
            console.error("Failed to parse chart data:", e);
            return <div className="text-red-500 p-4">Error: Invalid chart data format</div>;
        }
    }

    if (!Array.isArray(chartData)) {
        return <div className="text-red-500 p-4">Error: Chart data must be an array</div>;
    }

    if (chartData.length === 0) {
        return <div className="text-gray-500 p-4">No data available for chart</div>;
    }

    const SAFE_THEME_COLORS: Record<string, string> = {
        "--background": "#ffffff",
        "--foreground": "#0f172a",
        "--card": "#ffffff",
        "--card-foreground": "#0f172a",
        "--popover": "#ffffff",
        "--popover-foreground": "#0f172a",
        "--primary": "#2563eb",
        "--primary-foreground": "#f8fafc",
        "--secondary": "#0ea5e9",
        "--secondary-foreground": "#0f172a",
        "--muted": "#e2e8f0",
        "--muted-foreground": "#334155",
        "--accent": "#fef3c7",
        "--accent-foreground": "#0f172a",
        "--destructive": "#ef4444",
        "--border": "#e2e8f0",
        "--input": "#e2e8f0",
        "--ring": "#94a3b8",
        "--chart-1": "#3b82f6",
        "--chart-2": "#10b981",
        "--chart-3": "#f59e0b",
        "--chart-4": "#ec4899",
        "--chart-5": "#8b5cf6",
        "--sidebar": "#0f172a",
        "--sidebar-foreground": "#f8fafc",
        "--sidebar-primary": "#2563eb",
        "--sidebar-primary-foreground": "#f8fafc",
        "--sidebar-accent": "#1e293b",
        "--sidebar-accent-foreground": "#f8fafc",
        "--sidebar-border": "#1f2937",
        "--sidebar-ring": "#94a3b8",
    };

    const sanitizeColorString = (value: string | null, fallback = "#000000") => {
        if (!value) return value;
        if (value.includes("oklch(")) {
            return value.replace(/oklch\([^)]*\)/g, fallback);
        }
        return value;
    };

    const applySafeTheme = (root: HTMLElement | null) => {
        if (!root) return;
        Object.entries(SAFE_THEME_COLORS).forEach(([token, value]) => {
            root.style.setProperty(token, value);
        });
    };

    const scrubInlineColors = (clonedDoc: Document) => {
        const elements = clonedDoc.querySelectorAll<HTMLElement | SVGElement>("*");
        const svgColorAttrs = ["fill", "stroke", "stop-color"];
        elements.forEach((el) => {
            const styleAttr = el.getAttribute("style");
            if (styleAttr?.includes("oklch(")) {
                el.setAttribute("style", sanitizeColorString(styleAttr) ?? "");
            }
            svgColorAttrs.forEach((attr) => {
                const attrValue = el.getAttribute(attr);
                if (attrValue?.includes("oklch(")) {
                    el.setAttribute(attr, sanitizeColorString(attrValue, "#3b82f6") ?? "");
                }
            });
        });
    };

    // Helper to fix oklch colors in cloned DOM by removing problematic CSS
    const fixOklchColors = (clonedDoc: Document) => {
        try {
            // Remove ALL style tags - they might contain oklch in CSS variables
            const styleTags = clonedDoc.querySelectorAll('style');
            styleTags.forEach(style => {
                style.remove();
            });

            // Remove link tags that load external stylesheets
            const linkTags = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
            linkTags.forEach(link => {
                link.remove();
            });

            // Get the original element to compute styles from
            const originalElement = chartContainerRef.current;
            if (!originalElement) return;

            // Set explicit colors on all elements - simplified approach
            // Just set safe defaults and let html2canvas handle the rest
            const allElements = clonedDoc.querySelectorAll('*');
            allElements.forEach((el: Element) => {
                const htmlEl = el as HTMLElement;

                // Only fix body/html and elements that might have oklch
                if (htmlEl.tagName === 'BODY' || htmlEl.tagName === 'HTML') {
                    htmlEl.style.backgroundColor = '#ffffff';
                    htmlEl.style.color = '#000000';
                }

                // For chart container, ensure white background
                if (htmlEl.classList.contains('chart-container') ||
                    htmlEl.classList.contains('recharts-wrapper') ||
                    htmlEl.closest('.chart-container')) {
                    if (!htmlEl.style.backgroundColor || htmlEl.style.backgroundColor.includes('var(')) {
                        htmlEl.style.backgroundColor = '#ffffff';
                    }
                }
            });

            // Remove all CSS custom properties from root
            const root = clonedDoc.documentElement;
            if (root) {
                root.removeAttribute('style');
            }
            const body = clonedDoc.body;
            applySafeTheme(root);
            applySafeTheme(body);
            scrubInlineColors(clonedDoc);
        } catch (error) {
            console.warn('Error fixing oklch colors:', error);
        }
    };

    // Export functions
    const exportAsPNG = async () => {
        if (!chartContainerRef.current) return;

        try {
            const canvas = await html2canvas(chartContainerRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: false,
                allowTaint: true,
                foreignObjectRendering: false,
                onclone: (clonedDoc, element) => {
                    fixOklchColors(clonedDoc);
                },
            });
            const dataUrl = canvas.toDataURL('image/png');

            const link = document.createElement('a');
            link.download = `${config.title || 'chart'}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Error exporting PNG:', error);
        }
    };

    const exportAsPNGWithData = async () => {
        if (!chartContainerRef.current) return;

        try {
            // Create a temporary container with chart + data table
            const exportContainer = document.createElement('div');
            exportContainer.style.width = '1200px';
            exportContainer.style.padding = '20px';
            exportContainer.style.backgroundColor = 'white';
            exportContainer.style.fontFamily = 'Arial, sans-serif';

            // Clone the chart
            const chartClone = chartContainerRef.current.cloneNode(true) as HTMLElement;
            exportContainer.appendChild(chartClone);

            // Add data table
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.marginTop = '20px';
            table.style.borderCollapse = 'collapse';
            table.style.fontSize = '12px';

            // Table header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const headers = [config.xAxisKey, ...config.seriesKeys];
            headers.forEach(key => {
                const th = document.createElement('th');
                th.textContent = key;
                th.style.border = '1px solid #ddd';
                th.style.padding = '8px';
                th.style.backgroundColor = '#f2f2f2';
                th.style.textAlign = 'left';
                th.style.fontWeight = 'bold';
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Table body
            const tbody = document.createElement('tbody');
            chartData.forEach((item: any) => {
                const row = document.createElement('tr');
                headers.forEach(key => {
                    const td = document.createElement('td');
                    td.textContent = String(item[key] ?? '');
                    td.style.border = '1px solid #ddd';
                    td.style.padding = '8px';
                    row.appendChild(td);
                });
                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            exportContainer.appendChild(table);

            // Temporarily add to DOM
            exportContainer.style.position = 'absolute';
            exportContainer.style.left = '-9999px';
            exportContainer.style.top = '0';
            document.body.appendChild(exportContainer);

            // Capture
            const canvas = await html2canvas(exportContainer, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: false,
                allowTaint: true,
                foreignObjectRendering: false,
                onclone: (clonedDoc) => {
                    fixOklchColors(clonedDoc);
                },
            });
            const dataUrl = canvas.toDataURL('image/png');

            // Cleanup
            document.body.removeChild(exportContainer);

            // Download
            const link = document.createElement('a');
            link.download = `${config.title || 'chart'}_with_data.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Error exporting PNG with data:', error);
        }
    };

    const exportAsPDF = async () => {
        if (!chartContainerRef.current) return;

        try {
            // Create a temporary container with chart + data table
            const exportContainer = document.createElement('div');
            exportContainer.style.width = '1200px';
            exportContainer.style.padding = '20px';
            exportContainer.style.backgroundColor = 'white';
            exportContainer.style.fontFamily = 'Arial, sans-serif';

            // Clone the chart
            const chartClone = chartContainerRef.current.cloneNode(true) as HTMLElement;
            exportContainer.appendChild(chartClone);

            // Add data table
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.marginTop = '20px';
            table.style.borderCollapse = 'collapse';
            table.style.fontSize = '12px';

            // Table header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const headers = [config.xAxisKey, ...config.seriesKeys];
            headers.forEach(key => {
                const th = document.createElement('th');
                th.textContent = key;
                th.style.border = '1px solid #ddd';
                th.style.padding = '8px';
                th.style.backgroundColor = '#f2f2f2';
                th.style.textAlign = 'left';
                th.style.fontWeight = 'bold';
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Table body
            const tbody = document.createElement('tbody');
            chartData.forEach((item: any) => {
                const row = document.createElement('tr');
                headers.forEach(key => {
                    const td = document.createElement('td');
                    td.textContent = String(item[key] ?? '');
                    td.style.border = '1px solid #ddd';
                    td.style.padding = '8px';
                    row.appendChild(td);
                });
                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            exportContainer.appendChild(table);

            // Temporarily add to DOM
            exportContainer.style.position = 'absolute';
            exportContainer.style.left = '-9999px';
            exportContainer.style.top = '0';
            document.body.appendChild(exportContainer);

            // Capture
            const canvas = await html2canvas(exportContainer, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: false,
                allowTaint: true,
                foreignObjectRendering: false,
                onclone: (clonedDoc) => {
                    fixOklchColors(clonedDoc);
                },
            });

            // Cleanup
            document.body.removeChild(exportContainer);

            // Create PDF
            const pdf = new jsPDF('landscape', 'mm', 'a4');
            const imgWidth = 297; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`${config.title || 'chart'}.pdf`);
        } catch (error) {
            console.error('Error exporting PDF:', error);
        }
    };

    const exportAsSVG = () => {
        if (!chartContainerRef.current) return;

        try {
            const svgElement = chartContainerRef.current.querySelector('svg');
            if (!svgElement) {
                console.error('No SVG element found');
                return;
            }

            // Clone the SVG to avoid modifying the original
            const svgClone = svgElement.cloneNode(true) as SVGElement;

            // Get computed styles and apply them
            const computedStyle = window.getComputedStyle(chartContainerRef.current);
            const svgNS = 'http://www.w3.org/2000/svg';

            // Create a wrapper SVG with proper dimensions
            const wrapper = document.createElementNS(svgNS, 'svg');
            wrapper.setAttribute('xmlns', svgNS);
            wrapper.setAttribute('width', svgElement.getAttribute('width') || '800');
            wrapper.setAttribute('height', svgElement.getAttribute('height') || '400');

            // Add title and description
            const title = document.createElementNS(svgNS, 'title');
            title.textContent = config.title || 'Chart';
            wrapper.appendChild(title);

            const desc = document.createElementNS(svgNS, 'desc');
            desc.textContent = config.description || '';
            wrapper.appendChild(desc);

            // Append the cloned chart
            wrapper.appendChild(svgClone);

            const svgData = new XMLSerializer().serializeToString(wrapper);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            const link = document.createElement('a');
            link.download = `${config.title || 'chart'}.svg`;
            link.href = url;
            link.click();

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting SVG:', error);
        }
    };

    const exportAsCSV = () => {
        try {
            const headers = [config.xAxisKey, ...config.seriesKeys];
            const csvRows = [
                headers.join(','), // Header row
                ...chartData.map((item: any) =>
                    headers.map(header => {
                        const value = item[header];
                        // Handle values with commas, quotes, or newlines
                        if (value === null || value === undefined) return '';
                        const stringValue = String(value);
                        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                            return `"${stringValue.replace(/"/g, '""')}"`;
                        }
                        return stringValue;
                    }).join(',')
                )
            ];

            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `${config.title || 'chart'}_data.csv`;
            link.href = url;
            link.click();

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting CSV:', error);
        }
    };

    const exportAsHTML = async () => {
        if (!chartContainerRef.current) return;

        try {
            // Wait a bit to ensure chart is fully rendered
            await new Promise(resolve => setTimeout(resolve, 100));

            // Find the ResponsiveContainer which contains the actual chart
            const responsiveContainer = chartContainerRef.current.querySelector('.recharts-responsive-container');

            // Get the SVG element from within the ResponsiveContainer (not the download button)
            let svgElement: SVGElement | null = null;

            if (responsiveContainer) {
                // Find the recharts-wrapper inside ResponsiveContainer
                const rechartsWrapper = responsiveContainer.querySelector('.recharts-wrapper');
                if (rechartsWrapper) {
                    svgElement = rechartsWrapper.querySelector('svg');
                }
            }

            // Fallback: try to find any SVG that's not the download icon
            // Exclude SVGs that are in buttons or have lucide classes
            if (!svgElement) {
                const allSvgs = chartContainerRef.current.querySelectorAll('svg');
                svgElement = Array.from(allSvgs).find(svg => {
                    // Skip if it's in a button (download button)
                    if (svg.closest('button')) return false;

                    // Skip if it has lucide class (icon)
                    if (svg.classList.contains('lucide')) return false;

                    // Check if it's actually a chart SVG by looking at its content
                    // Chart SVGs have paths, rects, or other chart elements
                    const hasChartContent = svg.querySelector('path[d*="M"], rect, circle, line') !== null;

                    // Also check size - chart SVGs are typically larger
                    const bbox = svg.getBBox();
                    const isLargeEnough = bbox.width > 200 || bbox.height > 200;

                    return hasChartContent && isLargeEnough;
                }) as SVGElement | null;
            }

            if (!svgElement) {
                console.error('No chart SVG element found in chart container');
                alert('Chart SVG not found. Please ensure the chart is fully rendered before exporting.');
                return;
            }

            // Clone the SVG and ensure it has proper dimensions
            const svgClone = svgElement.cloneNode(true) as SVGElement;

            // Get dimensions from the original SVG or its container
            const bbox = (svgElement as unknown as SVGGraphicsElement).getBBox();
            const width = svgElement.getAttribute('width') ||
                (bbox.width > 0 ? String(bbox.width) : '800');
            const height = svgElement.getAttribute('height') ||
                (bbox.height > 0 ? String(bbox.height) : '400');

            // Ensure the cloned SVG has explicit dimensions
            svgClone.setAttribute('width', width);
            svgClone.setAttribute('height', height);

            // Set viewBox if not present
            if (!svgClone.getAttribute('viewBox')) {
                svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
            }

            // Remove any style attributes that might cause issues
            svgClone.removeAttribute('style');

            // Serialize the SVG
            const svgData = new XMLSerializer().serializeToString(svgClone);

            // Debug: log if SVG data is empty
            if (!svgData || svgData.trim().length === 0) {
                console.error('SVG serialization produced empty string');
                alert('Failed to serialize chart SVG. Please try again.');
                return;
            }

            // Create HTML with embedded SVG (no external dependencies)
            const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title || 'Chart'}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .chart-container {
            background: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            margin: 0 0 8px 0;
            color: #1f2937;
            font-size: 24px;
            font-weight: 600;
        }
        p {
            margin: 0 0 16px 0;
            color: #6b7280;
            font-size: 14px;
        }
        .chart-wrapper {
            width: 100%;
            margin-top: 16px;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .chart-wrapper svg {
            max-width: 100%;
            height: auto;
        }
        .data-table {
            margin-top: 24px;
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        th, td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        th {
            background-color: #f9fafb;
            font-weight: 600;
            color: #374151;
        }
        tr:hover {
            background-color: #f9fafb;
        }
    </style>
</head>
<body>
    <div class="chart-container">
        <h1>${config.title || 'Chart'}</h1>
        ${config.description ? `<p>${config.description}</p>` : ''}
        <div class="chart-wrapper">
            ${svgData || '<p style="color: red;">Error: Chart SVG could not be generated</p>'}
        </div>
        <div class="data-table">
            <table>
                <thead>
                    <tr>
                        <th>${config.xAxisKey}</th>
                        ${config.seriesKeys.map(key => `<th>${key}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${chartData.map((item: any) => `
                        <tr>
                            <td>${item[config.xAxisKey] ?? ''}</td>
                            ${config.seriesKeys.map(key => `<td>${item[key] ?? ''}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;

            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `${config.title || 'chart'}.html`;
            link.href = url;
            link.click();

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting HTML:', error);
        }
    };

    const renderChart = () => {
        switch (config.type) {
            case "bar":
                return (
                    <BarChart data={chartData as any}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey={config.xAxisKey} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {config.seriesKeys.map((key: string, i: number) => (
                            <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
                        ))}
                    </BarChart>
                );
            case "line":
                return (
                    <LineChart data={chartData as any}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey={config.xAxisKey} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {config.seriesKeys.map((key: string, i: number) => (
                            <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} />
                        ))}
                    </LineChart>
                );
            case "area":
                return (
                    <AreaChart data={chartData as any}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey={config.xAxisKey} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {config.seriesKeys.map((key: string, i: number) => (
                            <Area key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.3} />
                        ))}
                    </AreaChart>
                );
            case "pie":
                // Pie charts usually visualize one series. We'll take the first seriesKey.
                const dataKey = config.seriesKeys[0];
                return (
                    <PieChart>
                        <Pie
                            data={chartData as any}
                            dataKey={dataKey}
                            nameKey={config.xAxisKey}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            label
                        >
                            {(chartData as any).map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                );
            default:
                return <p className="text-red-500">Unsupported chart type: {config.type}</p>;
        }
    };

    return (
        <div ref={chartContainerRef} className="w-full h-96 bg-white p-4 rounded-lg border shadow-sm my-4">
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">{config.title}</h3>
                    <p className="text-xs text-gray-500">{config.description}</p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-4">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={exportAsPNG}>
                            <FileImage className="h-4 w-4 mr-2" />
                            Export as PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportAsPNGWithData}>
                            <FileImage className="h-4 w-4 mr-2" />
                            Export as PNG (with data table)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportAsPDF}>
                            <FileText className="h-4 w-4 mr-2" />
                            Export as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportAsSVG}>
                            <FileType className="h-4 w-4 mr-2" />
                            Export as SVG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportAsHTML}>
                            <FileCode className="h-4 w-4 mr-2" />
                            Export as Interactive HTML
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={exportAsCSV}>
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Export Data as CSV
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <ResponsiveContainer width="100%" height="85%" minWidth={0} minHeight={300}>
                {renderChart()}
            </ResponsiveContainer>
        </div>
    );
}
