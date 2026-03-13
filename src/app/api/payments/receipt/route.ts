import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get("order_id");

        if (!orderId) {
            return new Response("Order ID is required", { status: 400 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new Response("Unauthorized", { status: 401 });
        }

        const transaction = await db.paymentTransaction.findUnique({
            where: { order_id: orderId },
            include: {
                user: true,
                course: true,
                plan: true,
            }
        });

        if (!transaction) {
            return new Response("Transaction not found", { status: 404 });
        }

        // Security check: Only the owner or an admin can see the receipt
        const userId = parseInt(session.user.id);
        const isAdmin = session.user.role === 'admin';
        
        if (transaction.user_id !== userId && !isAdmin) {
            return new Response("Forbidden", { status: 403 });
        }

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - ${transaction.order_id}</title>
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 40px; }
        .receipt-card { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 8px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .company-info h1 { margin: 0; color: #4f46e5; font-size: 24px; }
        .receipt-label { font-size: 32px; font-weight: 800; color: #0f172a; margin: 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 8px; }
        .details p { margin: 4px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        th { text-align: left; padding: 12px; border-bottom: 2px solid #f1f5f9; color: #64748b; font-size: 12px; text-transform: uppercase; }
        td { padding: 16px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .total-row td { border-bottom: none; padding-top: 24px; }
        .total-box { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: right; }
        .total-label { font-size: 14px; color: #64748b; }
        .total-amount { font-size: 24px; font-weight: 800; color: #0f172a; display: block; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 40px; }
        @media print {
            body { padding: 0; }
            .receipt-card { border: none; max-width: 100%; }
            .no-print { display: none; }
        }
        .btn-print { background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="no-print" style="max-width: 800px; margin: 0 auto; text-align: right;">
        <button class="btn-print" onclick="window.print()">Print Receipt</button>
    </div>
    <div class="receipt-card">
        <div class="header">
            <div class="company-info">
                <h1>Zirna</h1>
                <p style="font-size: 12px; color: #64748b; margin: 4px 0;">FIARA INFOTECH</p>
            </div>
            <div>
                <h2 class="receipt-label">RECEIPT</h2>
                <p style="text-align: right; margin: 4px 0; font-weight: 600;"># ${transaction.order_id}</p>
            </div>
        </div>

        <div class="info-grid">
            <div class="details">
                <h3 class="section-title">Billed To</h3>
                <p><strong>${transaction.user.name || transaction.user.username}</strong></p>
                <p>${transaction.user.email || ""}</p>
            </div>
            <div class="details" style="text-align: right;">
                <h3 class="section-title">Payment Details</h3>
                <p>Date: ${new Date(transaction.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p>Status: <span style="color: #059669; font-weight: 700;">${transaction.status}</span></p>
                <p>Method: ${transaction.payment_method || "Online Payment"}</p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <strong>${transaction.course?.title || transaction.plan?.display_name || "Educational Content"}</strong>
                        <br>
                        <span style="font-size: 12px; color: #64748b;">${transaction.description || ""}</span>
                    </td>
                    <td style="text-align: right; font-weight: 600;">
                        ${transaction.currency} ${Number(transaction.amount).toFixed(2)}
                    </td>
                </tr>
            </tbody>
        </table>

        <div class="total-box">
            <span class="total-label">Total Paid</span>
            <span class="total-amount">${transaction.currency} ${Number(transaction.amount).toFixed(2)}</span>
        </div>

        <div class="footer">
            <p>Thank you for choosing Zirna. This is a computer-generated receipt.</p>
            <p>© ${new Date().getFullYear()} Fiara Infotech. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `;

        return new Response(html, {
            headers: {
                "Content-Type": "text/html",
            },
        });

    } catch (error) {
        console.error("[RECEIPT-API] Error generating receipt:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
