Based on your **Hybrid Search + LlamaParse + Gemini** architecture, your costs are significantly higher than a standard wrapper because you are paying for _accuracy_ (LlamaParse is expensive for OCR).

To remain profitable, you cannot offer "Unlimited Premium OCR" on cheap plans. You must gate the **"Deep Analysis"** (LlamaParse Premium) feature behind higher tiers or strict caps.

Here is the recommended pricing strategy to ensure you cover your API costs while remaining competitive.

### **1. Strategic Pricing Tiers**

| Feature             | **Free Tier** (The Hook)    | **Pro Plan** (The Standard)                   | **Power / Team** (The Professional) |
| :------------------ | :-------------------------- | :-------------------------------------------- | :---------------------------------- |
| **Price**           | **$0 / month**              | **$15 / month**                               | **$45 / month**                     |
| **Files per Month** | 3 files                     | 50 files                                      | Unlimited (Fair use cap)            |
| **Pages per Month** | 50 pages                    | 1,000 pages                                   | 5,000 pages                         |
| **File Size Limit** | 5 MB                        | 32 MB                                         | 100 MB                              |
| **Parsing Mode**    | **Fast Mode Only** (No OCR) | **Fast Mode** (Unlimited) + **500 OCR Pages** | **OCR Priority** (2,500 OCR Pages)  |
| **AI Model**        | Gemini 1.5 Flash            | Gemini 1.5 Flash                              | **Gemini 1.5 Pro**                  |
| **Feature Access**  | Chat only                   | Split-screen & Citations                      | Compare Mode & Batch Extraction     |

---

### **2. Why This Structure? (The Math)**

#### **A. The "Hidden" Costs (Your COGS)**

You need to know exactly what one user costs you to set these prices.

- **LlamaParse (Premium/OCR):** Costs ~**$0.003 per page** (0.3 credits). If a user uploads a 50-page complex invoice, that cost is **$0.15** instantly.
- **LlamaParse (Fast Mode):** Costs ~**$0.001 per page**. Much cheaper.
- **Gemini 1.5 Flash:** Extremely cheap (~$0.0001 per 1k tokens).
- **Vector Storage (Supabase):** Negligible until millions of vectors.

#### **B. Profit Margin Calculation (Pro Plan - $15/mo)**

- **Scenario:** A user uploads 20 PDFs (avg 20 pages) and asks 500 questions.
- **Parsing Cost:** 400 pages total.
  - If 100% Premium OCR: $1.20
  - If 50/50 Mix: $0.80
- **AI Chat Cost:** 500 questions x 2k tokens x $0.0001 = **$0.10**
- **Storage:** ~$0.05
- **Total Cost:** **~$1.35**
- **Profit:** **$13.65** (91% Margin)
- _Risk:_ If you allowed _unlimited_ Premium OCR, a user could upload 5,000 pages ($15 cost), wiping out your profit. **This is why you must cap "OCR Pages" specifically.**

---

### **3. Critical Pricing Rules for Your App**

#### **Rule 1: "Fast Mode" is Default**

Your app should default to **Fast Parsing** (Text extraction). Only use **LlamaParse Premium** when:

1.  The user clicks a "Deep Scan (OCR)" toggle.
2.  The system detects "Scanned Image" or "Complex Table" via a cheap pre-check.

- _Why:_ This saves you 90% on parsing costs.

#### **Rule 2: Sell "OCR Pages" as Add-ons**

If a Power User hits their 2,500 page OCR limit, don't force them to upgrade. Sell a **"Top-up Pack"**:

- **$5 for 500 extra OCR pages.**
- This is pure profit and handles heavy users without breaking your recurring revenue model.

#### **Rule 3: Annual Discounts**

Offer **2 months free** on annual plans ($150/year instead of $180).

- _Why:_ You get cash upfront to pay for your LlamaIndex/Supabase credits in bulk.

---

### **4. Implementation Plan**

**Step 1: Free Tier (Marketing Tool)**

- **Goal:** Get them hooked on the _citations_ and _split-screen_ UI.
- **Limit:** 3 Files / 50 Pages.
- **Tech:** Force `fastMode: true` in your LlamaParse config. Use Gemini Flash.
- **Cost to you:** < $0.05 per user.

**Step 2: Pro Tier ($15/mo)**

- **Target:** Students, Researchers.
- **Limit:** 50 Files / 1,000 Pages.
- **Tech:** Allow `premiumMode` but warn "Uses OCR Credits". Use Gemini Flash (it's smart enough for RAG).
- **Value Prop:** "Unlimited Questions" and "High-Res Table Scanning."

**Step 3: Power Tier ($45/mo)**

- **Target:** Lawyers, Accountants, Engineers.
- **Limit:** Unlimited Files / 5,000 Pages (Fair Use).
- **Tech:** Use **Gemini 1.5 Pro**. The reasoning capabilities are better for complex legal logic.
- **Value Prop:** "Compare Mode" (Redlining), "Batch CSV Extraction," and "Legal-Grade Accuracy."

**Would you like me to write the `Stripe` product definition or the database schema to track these "OCR Credit" limits per user?**
