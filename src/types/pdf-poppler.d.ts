declare module 'pdf-poppler' {
    export interface ConvertOptions {
        format?: string;
        scale?: number;
        out_dir?: string;
        out_prefix?: string;
        page?: number | null;
    }

    export function convert(file: string, opts?: ConvertOptions): Promise<void>;
    export function info(file: string): Promise<any>;
}
