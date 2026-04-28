/**
 * Claude Analyzer — RSL Vault
 * ============================================
 * Analyzes meeting transcripts (Iraqi Arabic + English) to extract
 * RSL platform improvement ideas with feasibility + cost analysis.
 *
 * Pipeline:
 *   transcript text → Claude Sonnet 4.6 → structured ideas array
 *
 * For each idea, we extract:
 *   1. What is it? (title, description, category)
 *   2. Is it feasible? (boolean + reasoning)
 *   3. What does it cost? (dev days + monthly $)
 *   4. Source quote from the transcript
 *
 * Decision (APPROVE/REJECT) is left to Humam in the UI.
 */
import Anthropic from "@anthropic-ai/sdk";
import { IdeaCategory, Priority } from "@prisma/client";

// ============================================================
// CLIENT SINGLETON (lazy init — avoids build-time crash)
// ============================================================
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not set in environment");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ============================================================
// TYPES — what Claude returns (must match prompt JSON schema)
// ============================================================
export interface AnalyzedIdea {
  title: string;
  description: string;
  category: IdeaCategory;
  priority: Priority;
  feasible: boolean;
  feasibilityReasoning: string;
  estimatedDays: number | null;
  estimatedMonthlyCost: number;
  sourceQuote: string;
  proposedMonth: string | null;
  tags: string[];
}

export interface AnalysisResult {
  ideas: AnalyzedIdea[];
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
}

// ============================================================
// MODEL CONFIG
// ============================================================
const MODEL = "claude-sonnet-4-5"; // Sonnet 4.6 — cheaper, fast, sufficient
const MAX_TOKENS = 4096;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 2000;

// Pricing as of 2026-04 (per million tokens)
const PRICE_INPUT_PER_M = 3.0;
const PRICE_OUTPUT_PER_M = 15.0;

// ============================================================
// PROMPT — Hybrid: English instructions, Arabic context
// ============================================================
const SYSTEM_PROMPT = `You are a product analyst for RSL-AI, a SaaS ERP platform for Iraqi medical labs.

Your job: read meeting transcripts (mixed Iraqi Arabic + English) between Humam Al-Azzawi (founder, financial consultant) and Ali Jalal (partner). Extract every idea proposed for improving the RSL platform.

For each idea, analyze:
1. **What** — clear title and description (in Arabic, since the team works in Arabic)
2. **Feasibility** — can it be built? Why or why not?
3. **Cost** — estimated dev days + monthly recurring $ (cloud, APIs, etc.)

Respond ONLY with a JSON object matching this exact schema:

\`\`\`json
{
  "ideas": [
    {
      "title": "string (Arabic, max 80 chars)",
      "description": "string (Arabic, 1-3 sentences explaining the idea)",
      "category": "FEATURE | BUG | IMPROVEMENT | STRATEGIC | ARCHITECTURE",
      "priority": "LOW | MEDIUM | HIGH | CRITICAL",
      "feasible": true | false,
      "feasibilityReasoning": "string (Arabic, why feasible/not — mention dependencies, tech requirements)",
      "estimatedDays": number | null,
      "estimatedMonthlyCost": number,
      "sourceQuote": "string (the actual quote from the transcript that proposed this idea, in original language)",
      "proposedMonth": "Month 1" | "Month 2" | "Month 3" | "Month 4" | "Month 5" | "Month 6" | null,
      "tags": ["string", "string"]
    }
  ]
}
\`\`\`

## Categorization rules

- **FEATURE** — new product capability (e.g., "تقرير شهري للمختبرات")
- **BUG** — fixing existing broken behavior
- **IMPROVEMENT** — enhancement to existing feature
- **STRATEGIC** — business/market positioning (pricing, sectors, partnerships)
- **ARCHITECTURE** — technical infrastructure (database, deployment, performance)

## Priority guidelines

- **CRITICAL** — blocks revenue or breaks production
- **HIGH** — competitive necessity for first lab launch (Q4 2026)
- **MEDIUM** — desirable but deferrable
- **LOW** — nice-to-have, no urgency

## Feasibility — be honest

- TRUE: "نقدر نسوّيها بالـ stack الموجود (Next.js, Prisma, Cloud Run)"
- FALSE: "تحتاج integration مع جهة خارجية لا نقدر نوصلها" / "يحتاج research طويل"

If feasible=false, estimatedDays should be null.

## Cost estimation

- **estimatedDays**: realistic dev time for ONE engineer (Humam) — be honest, include testing
- **estimatedMonthlyCost**: NEW recurring cost in USD (e.g., $50/month for WhatsApp Business API)
  - If using existing infra (Cloud Run, OpenAI, Anthropic) → 0
  - If new SaaS dependency → estimate based on typical pricing
  - If unknown → 0 with note in feasibilityReasoning

## Tag conventions (lowercase, English)

Useful tags: "lab-specific", "medical-device", "billing", "reporting", "integration", "ai", "ui", "performance", "security", "iraqi-market", "compliance".

## Important rules

- If the transcript contains NO ideas about RSL platform improvements (e.g., personal chat, off-topic), return: \`{"ideas": []}\`
- Quote the EXACT source text — preserve original Arabic/English mix
- Don't invent ideas not actually discussed
- Don't merge multiple distinct ideas into one
- Don't split one idea into multiple variants (unless the speakers themselves did so)
- Output VALID JSON only — no markdown fences, no preamble, no commentary

## Example (للتوضيح فقط)

Transcript snippet (Iraqi Arabic):
> همام: "علي شو رأيك نضيف notification email لما المختبر يخلّص النتيجة؟"
> علي: "حلوة. بس الناس هنا ما يفتحون email. ليش ما WhatsApp؟"
> همام: "WhatsApp Business API مكلف. خلّيه enterprise tier فقط."

Expected output:
\`\`\`json
{
  "ideas": [
    {
      "title": "إشعارات بريد إلكتروني للمرضى عند جاهزية النتائج",
      "description": "إرسال email تلقائي للمريض لما النتيجة تكون جاهزة. يُحسّن تجربة المريض ويقلل ضغط على المختبر.",
      "category": "FEATURE",
      "priority": "MEDIUM",
      "feasible": true,
      "feasibilityReasoning": "نستخدم Resend موجود مسبقاً للـ password reset. إضافة template جديدة + trigger من lab module.",
      "estimatedDays": 2,
      "estimatedMonthlyCost": 0,
      "sourceQuote": "علي شو رأيك نضيف notification email لما المختبر يخلّص النتيجة؟",
      "proposedMonth": "Month 5",
      "tags": ["lab-specific", "integration", "ui"]
    },
    {
      "title": "إشعارات WhatsApp Business — Enterprise tier فقط",
      "description": "بدلاً من email، إرسال إشعار النتائج عبر WhatsApp. يقتصر على Enterprise tier ($200+) لتعويض التكلفة.",
      "category": "FEATURE",
      "priority": "MEDIUM",
      "feasible": true,
      "feasibilityReasoning": "WhatsApp Business API متاح عبر Twilio أو Meta مباشرة. تكلفة ~$50/شهر/مختبر + setup.",
      "estimatedDays": 5,
      "estimatedMonthlyCost": 50,
      "sourceQuote": "WhatsApp Business API مكلف. خلّيه enterprise tier فقط.",
      "proposedMonth": "Month 6",
      "tags": ["lab-specific", "integration", "iraqi-market"]
    }
  ]
}
\`\`\`

Now analyze the transcript provided in the user message.`;

// ============================================================
// MAIN FUNCTION
// ============================================================
export async function analyzeMeetingTranscript(
  transcriptText: string,
  options?: {
    meetingTitle?: string;
    meetingDate?: Date;
  }
): Promise<AnalysisResult> {
  if (!transcriptText || transcriptText.trim().length === 0) {
    return {
      ideas: [],
      modelUsed: MODEL,
      inputTokens: 0,
      outputTokens: 0,
      costUSD: 0,
    };
  }

  const userMessage = buildUserMessage(transcriptText, options);
  const client = getClient();

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      // Extract text from content blocks
      const textBlocks = response.content.filter(
        (block) => block.type === "text"
      );
      if (textBlocks.length === 0) {
        throw new Error("Claude returned no text content");
      }
      const responseText = textBlocks
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");

      // Parse JSON (with cleanup for stray markdown if Claude slips)
      const cleaned = responseText
        .replace(/^```json\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let parsed: { ideas: AnalyzedIdea[] };
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        throw new Error(
          `Failed to parse Claude JSON: ${parseError}. Raw: ${cleaned.substring(0, 500)}`
        );
      }

      if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
        throw new Error(
          `Invalid response shape: expected {ideas: []}, got: ${cleaned.substring(0, 200)}`
        );
      }

      // Validate each idea (defensive — Claude usually follows schema)
      const validIdeas = parsed.ideas.filter((idea) =>
        validateIdea(idea)
      );

      // Compute cost
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const costUSD =
        (inputTokens * PRICE_INPUT_PER_M) / 1_000_000 +
        (outputTokens * PRICE_OUTPUT_PER_M) / 1_000_000;

      return {
        ideas: validIdeas,
        modelUsed: MODEL,
        inputTokens,
        outputTokens,
        costUSD: Math.round(costUSD * 10000) / 10000, // 4 decimals
      };
    } catch (error) {
      lastError = error;
      console.error(
        `[claude-analyzer] Attempt ${attempt}/${MAX_RETRIES} failed:`,
        error
      );

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS * attempt);
      }
    }
  }

  throw new Error(
    `Claude analysis failed after ${MAX_RETRIES} attempts. Last error: ${lastError}`
  );
}

// ============================================================
// HELPERS
// ============================================================
function buildUserMessage(
  transcript: string,
  options?: { meetingTitle?: string; meetingDate?: Date }
): string {
  const meta: string[] = [];
  if (options?.meetingTitle) {
    meta.push(`Meeting title: ${options.meetingTitle}`);
  }
  if (options?.meetingDate) {
    meta.push(`Meeting date: ${options.meetingDate.toISOString().split("T")[0]}`);
  }

  const header = meta.length > 0 ? `${meta.join("\n")}\n\n---\n\n` : "";

  return `${header}Transcript:\n\n${transcript}\n\n---\n\nAnalyze the transcript above per your instructions. Output valid JSON only.`;
}

function validateIdea(idea: unknown): idea is AnalyzedIdea {
  if (!idea || typeof idea !== "object") return false;
  const i = idea as Record<string, unknown>;

  return (
    typeof i.title === "string" &&
    typeof i.description === "string" &&
    typeof i.category === "string" &&
    typeof i.priority === "string" &&
    typeof i.feasible === "boolean" &&
    typeof i.feasibilityReasoning === "string" &&
    (typeof i.estimatedDays === "number" || i.estimatedDays === null) &&
    typeof i.estimatedMonthlyCost === "number" &&
    typeof i.sourceQuote === "string" &&
    (typeof i.proposedMonth === "string" || i.proposedMonth === null) &&
    Array.isArray(i.tags)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
