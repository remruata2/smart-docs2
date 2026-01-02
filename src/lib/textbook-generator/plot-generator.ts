/**
 * Python Plot Generator Service
 * Executes Python/Matplotlib code to generate mathematically precise plots
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { supabaseAdmin } from '@/lib/supabase';

interface PlotGenerationResult {
    success: boolean;
    imageBuffer?: Buffer;
    error?: string;
}

/**
 * Execute Python code and return the generated plot as a buffer
 */
export async function executePythonPlot(pythonCode: string): Promise<PlotGenerationResult> {
    // Create temporary directory for this plot
    const tempDir = path.join(process.cwd(), 'temp-plots', `plot-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const scriptPath = path.join(tempDir, 'plot.py');
    const outputPath = path.join(tempDir, 'output.png');

    try {
        // Prepare Python code with output saving
        const fullCode = `
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
${pythonCode}
import matplotlib.pyplot as plt
plt.savefig('${outputPath}', dpi=150, bbox_inches='tight', facecolor='white')
plt.close()
`;

        // Write Python script
        await fs.writeFile(scriptPath, fullCode);

        // Execute Python script
        const result = await runPythonScript(scriptPath);

        if (!result.success) {
            return { success: false, error: result.error };
        }

        // Read generated image
        const imageBuffer = await fs.readFile(outputPath);

        // Cleanup temp directory
        await fs.rm(tempDir, { recursive: true, force: true });

        return { success: true, imageBuffer };

    } catch (error) {
        // Cleanup on error
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to execute Python code'
        };
    }
}

/**
 * Run Python script with timeout and error handling
 */
function runPythonScript(scriptPath: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
        const timeout = 10000; // 10 seconds
        let timedOut = false;

        const pythonProcess = spawn('python3', [scriptPath], {
            cwd: path.dirname(scriptPath),
        });

        const timer = setTimeout(() => {
            timedOut = true;
            pythonProcess.kill();
            resolve({ success: false, error: 'Python execution timed out (10s limit)' });
        }, timeout);

        let stderr = '';

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
            clearTimeout(timer);

            if (timedOut) return;

            if (code === 0) {
                resolve({ success: true });
            } else {
                resolve({
                    success: false,
                    error: `Python script failed with code ${code}: ${stderr}`
                });
            }
        });

        pythonProcess.on('error', (err) => {
            clearTimeout(timer);
            resolve({
                success: false,
                error: `Failed to start Python: ${err.message}`
            });
        });
    });
}

/**
 * Upload plot image to Supabase storage
 */
export async function uploadPlotToStorage(
    imageBuffer: Buffer,
    chapterId: number,
    plotIndex: number
): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        if (!supabaseAdmin) {
            return { success: false, error: 'Supabase not configured' };
        }

        const bucketName = 'textbook_images';
        const filename = `chapter-${chapterId}/plot-${plotIndex}.png`;

        // Ensure bucket exists
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        if (!buckets?.find(b => b.name === bucketName)) {
            await supabaseAdmin.storage.createBucket(bucketName, {
                public: true,
                fileSizeLimit: 52428800, // 50MB
            });
        }

        // Upload image
        const { data, error } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(filename, imageBuffer, {
                contentType: 'image/png',
                upsert: true,
            });

        if (error) {
            console.error('[PLOT-UPLOAD] Supabase error:', error);
            return { success: false, error: error.message };
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(filename);

        console.log(`[PLOT-UPLOAD] Uploaded to: ${urlData.publicUrl}`);

        return { success: true, url: urlData.publicUrl };

    } catch (error) {
        console.error('[PLOT-UPLOAD] Error uploading plot:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to upload plot',
        };
    }
}

/**
 * Check if Python and required packages are available
 */
export async function checkPythonEnvironment(): Promise<{ available: boolean; error?: string }> {
    try {
        const result = await new Promise<boolean>((resolve) => {
            const checkProcess = spawn('python3', ['-c', 'import matplotlib; import numpy']);

            checkProcess.on('close', (code) => {
                resolve(code === 0);
            });

            checkProcess.on('error', () => {
                resolve(false);
            });
        });

        if (!result) {
            return {
                available: false,
                error: 'Python3 or required packages (matplotlib, numpy) not installed'
            };
        }

        return { available: true };

    } catch (error) {
        return {
            available: false,
            error: error instanceof Error ? error.message : 'Failed to check Python environment'
        };
    }
}
