import { NextRequest, NextResponse } from "next/server";

/**
 * Mobile Return Bridge
 * SmartGateway redirects here after payment completion.
 * The mobile WebView detects this URL and reads the query params.
 * This endpoint returns a simple HTML page showing payment status.
 */
export async function GET(request: NextRequest) {
    const orderId = request.nextUrl.searchParams.get("order_id") || "unknown";
    const status = request.nextUrl.searchParams.get("status") || "unknown";

    // Return a simple HTML page that the WebView can display briefly
    // The mobile app will detect this URL and close the WebView
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: #f8fafc;
                text-align: center;
                padding: 20px;
            }
            .container { max-width: 400px; }
            .icon { font-size: 48px; margin-bottom: 16px; }
            h1 { color: #1e293b; font-size: 20px; margin-bottom: 8px; }
            p { color: #64748b; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">✅</div>
            <h1>Payment Processing</h1>
            <p>Please wait while we verify your payment...</p>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">Order: ${orderId}</p>
        </div>
    </body>
    </html>`;

    return new NextResponse(html, {
        headers: { "Content-Type": "text/html" },
    });
}

// SmartGateway may POST to the return URL
export async function POST(request: NextRequest) {
    const url = new URL(request.url);
    return GET(new NextRequest(url, { method: "GET" }));
}
