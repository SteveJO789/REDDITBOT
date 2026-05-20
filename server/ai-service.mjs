import OpenAI from "openai";
import process from "node:process";

const llmEnabled = process.env.LLM_ENABLED === "true";
const apiKey = process.env.OPENROUTER_API_KEY;
const modelName = process.env.AI_MODEL ?? "anthropic/claude-sonnet-4.6";

let openai = null;
if (llmEnabled && apiKey) {
  openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    defaultHeaders: {
      "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
      "X-Title": "Operation Empathy Dashboard",
    }
  });
}

const systemInstruction = `
You are an internal AI assistant for "Operation Empathy", a sales-growth tool.
Your goal is to identify customer pain points, classify sales opportunities, and generate safe draft replies.
You must follow these safety rules:
1. No medical claims. Do not suggest products cure, treat, or diagnose any disease.
2. Be helpful first, non-promotional in first replies.
3. No links or DM requests in first public replies.
4. Detect high medical risk and flag it.
5. Detect low-quality memes or rants.
`;

export async function classifyPostWithAI(post) {
  if (!openai) {
    throw new Error("OpenRouter AI is not enabled or API key is missing.");
  }

  const prompt = `
  Classify the following Reddit post.
  Subreddit: ${post.subreddit}
  Title: ${post.title}
  Body: ${post.body}

  Return a JSON object with these fields:
  - intent_category: one of [asking_for_help, looking_for_recommendations, expressing_frustration, comparing_solutions, complaining_about_workflow, study_fatigue, burnout, desk_discomfort, joke_or_meme, low_quality_rant, high_risk_medical_case]
  - relevance_score: 0-10
  - helpfulness_opportunity: 0-10
  - buying_signal_score: 0-10
  - medical_risk: low, medium, or high
  - promotion_risk: low, medium, or high
  - should_reply: yes or no
  - reason: brief explanation
  - recommended_response_angle: brief guidance
  - red_flags_detected: array of strings
  - ai_summary: brief one-sentence summary

  Ensure the output is strictly valid JSON.
  `;

  const completion = await openai.chat.completions.create({
    model: modelName,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  const text = completion.choices[0].message.content;
  
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse AI JSON output:", text);
    throw new Error("AI returned invalid data format.");
  }
}

export async function generateDraftWithAI(post, classification) {
  if (!openai) {
    throw new Error("OpenRouter AI is not enabled or API key is missing.");
  }

  const prompt = `
  Generate a draft reply for this post based on the classification.
  Post Title: ${post.title}
  Post Body: ${post.body}
  Intent: ${classification.intent_category}
  Recommended Angle: ${classification.recommended_response_angle}

  Rules:
  - Be empathetic and helpful.
  - Suggest 2-3 practical free tips.
  - If medical risk is not low, encourage professional help.
  - No links, no DM requests, no aggressive selling.
  - Maximum 3-4 short paragraphs.
  - Do not use "I am an AI" or similar phrases.

  Return only the draft text.
  `;

  const completion = await openai.chat.completions.create({
    model: modelName,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ]
  });

  return completion.choices[0].message.content.trim();
}
