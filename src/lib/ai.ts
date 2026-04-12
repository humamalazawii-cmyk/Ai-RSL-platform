// =============================================================
// AI Engine — Wraps Claude API for all AI operations
// =============================================================

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export type AITask =
  | "generate_coa"
  | "generate_flowchart"
  | "suggest_journal_entry"
  | "detect_anomaly"
  | "generate_training"
  | "evaluate_performance"
  | "natural_language_query"
  | "generate_report_narrative";

interface AIRequest {
  task: AITask;
  context: Record<string, unknown>;
  language?: "en" | "ar";
}

interface AIResponse {
  success: boolean;
  data: unknown;
  confidence?: number;
  tokensUsed?: number;
}

// System prompts for each AI task
const SYSTEM_PROMPTS: Record<AITask, string> = {
  generate_coa: `You are an expert accountant specializing in IFRS and local GAAP standards across MENA region. Generate a complete Chart of Accounts tailored to the given sector, scale, and country. Return valid JSON array of accounts with: code, name, nameAr, type (asset/liability/equity/revenue/expense), subType, parentCode, level, isPostable, normalBalance.`,

  generate_flowchart: `You are a business process expert. Generate a complete flowchart for the described business process. Return valid JSON with: nodes (array of {id, type: start|process|decision|end, label, labelAr, position: {x,y}}) and edges (array of {id, source, target, label}).`,

  suggest_journal_entry: `You are an expert accountant. Based on the transaction description, suggest the appropriate journal entry with debit and credit accounts and amounts. Return JSON with: lines (array of {accountCode, accountName, debit, credit, description}), explanation, confidence (0-1).`,

  detect_anomaly: `You are a forensic accountant and fraud detection expert. Analyze the provided financial data for anomalies using Benford's Law, statistical outlier detection, and pattern analysis. Return JSON with: anomalies (array of {type, severity: low|medium|high|critical, description, affectedEntries, recommendation}).`,

  generate_training: `You are an AI training specialist. Create a personalized learning path for the given employee role and skill gaps. Return JSON with: modules (array of {title, titleAr, description, type: video|quiz|reading|practical, estimatedMinutes, content}), assessmentQuestions (array of {question, options, correctAnswer}).`,

  evaluate_performance: `You are an HR analytics expert. Analyze the employee performance data and provide a comprehensive evaluation. Return JSON with: overallScore (1-10), kpiScores (object), strengths (array), improvements (array), recommendations (array), promotionReadiness (0-100).`,

  natural_language_query: `You are an ERP assistant. Convert the natural language query into a structured database query or action. Return JSON with: intent (query|action|report), sqlHint (if query), parameters (object), humanResponse (string in user's language).`,

  generate_report_narrative: `You are a financial analyst. Generate a professional narrative analysis of the provided financial data. Write in the specified language. Include key insights, trends, and recommendations. Return JSON with: narrative (string), highlights (array of {metric, value, trend: up|down|stable, insight}).`,
};

export async function callAI(request: AIRequest): Promise<AIResponse> {
  const { task, context, language = "en" } = request;

  const systemPrompt = SYSTEM_PROMPTS[task];
  const userMessage = `Language: ${language === "ar" ? "Arabic" : "English"}
Context: ${JSON.stringify(context, null, 2)}
Respond ONLY with valid JSON. No markdown, no explanation outside JSON.`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => {
        if (block.type === "text") return block.text;
        return "";
      })
      .join("");

    const cleanJson = text.replace(/```json\n?|```/g, "").trim();
    const data = JSON.parse(cleanJson);

    return {
      success: true,
      data,
      confidence: data.confidence,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  } catch (error) {
    console.error(`AI Engine error [${task}]:`, error);
    return { success: false, data: null, confidence: 0 };
  }
}

// Convenience functions
export const generateCoA = (sector: string, scale: string, country: string) =>
  callAI({ task: "generate_coa", context: { sector, scale, country } });

export const generateFlowchart = (description: string, module: string, lang: "en" | "ar" = "en") =>
  callAI({ task: "generate_flowchart", context: { description, module }, language: lang });

export const suggestJournalEntry = (description: string, existingAccounts: unknown[]) =>
  callAI({ task: "suggest_journal_entry", context: { description, existingAccounts } });

export const detectAnomalies = (financialData: unknown) =>
  callAI({ task: "detect_anomaly", context: { financialData } });

export const generateTraining = (role: string, skillGaps: string[]) =>
  callAI({ task: "generate_training", context: { role, skillGaps } });

export const evaluatePerformance = (employeeData: unknown) =>
  callAI({ task: "evaluate_performance", context: { employeeData } });

export const queryNaturalLanguage = (query: string, lang: "en" | "ar" = "en") =>
  callAI({ task: "natural_language_query", context: { query }, language: lang });
