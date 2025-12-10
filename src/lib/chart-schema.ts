import { z } from "zod";

export const ChartSchema = z.object({
    title: z.string().describe("A short, descriptive title for the chart"),
    type: z.enum(["bar", "line", "pie", "area"]).describe("The type of chart to render"),
    description: z.string().describe("A 1-sentence insight about this data"),
    xAxisKey: z.string().describe("The JSON key to use for the X-axis (e.g., 'month', 'category')"),
    seriesKeys: z.array(z.string()).describe("List of JSON keys to plot as data series (e.g., ['revenue', 'cost'])"),
    data: z.union([z.string(), z.array(z.record(z.any()))]).describe("The raw data points as a JSON string or array of objects"),
});

export type ChartConfig = z.infer<typeof ChartSchema>;
