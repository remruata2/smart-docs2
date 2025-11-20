import "dotenv/config";
import { processChatMessageEnhancedStream } from "./src/lib/ai-service-enhanced";

async function verifyStreamChart() {
    console.log("Starting streaming chart verification...");

    const query = "create a bar chart with the above data";
    const mockHistory = [
        {
            id: "1",
            role: "user" as const,
            content: "Show me the revenue for 2023",
            timestamp: new Date(),
        },
        {
            id: "2",
            role: "assistant" as const,
            content: `Here is the revenue data:
| Quarter | Revenue |
|---|---|
| Q1 | 10000 |
| Q2 | 12000 |
| Q3 | 15000 |
| Q4 | 18000 |
`,
            timestamp: new Date(),
        },
    ];

    try {
        const generator = processChatMessageEnhancedStream(
            query,
            mockHistory,
            undefined,
            true,
            { model: "gemini-2.5-flash" }
        );

        let chartDataReceived = false;
        let doneReceived = false;

        for await (const chunk of generator) {
            console.log("Received chunk type:", chunk.type);

            if ((chunk as any).type === "data") {
                console.log("Chart Data Chunk Received!");
                console.log(JSON.stringify((chunk as any).chartData, null, 2));
                chartDataReceived = true;
            } else if (chunk.type === "done") {
                console.log("Done Chunk Received!");
                doneReceived = true;
            } else if (chunk.type === "token") {
                process.stdout.write(chunk.text || "");
            }
        }

        console.log("\n\nStream completed.");

        if (chartDataReceived && doneReceived) {
            console.log("SUCCESS: Chart data and Done signal received.");
        } else {
            console.error("FAILURE: Missing chart data or done signal.");
            if (!chartDataReceived) console.error("- Chart Data missing");
            if (!doneReceived) console.error("- Done signal missing");
        }

    } catch (error) {
        console.error("Verification failed:", error);
    }
}

verifyStreamChart();
