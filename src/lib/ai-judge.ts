import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export interface BattlerInput {
  userId: string;
  name: string;
  lyrics: string; // submitted or transcribed lyrics
}

export interface JudgeScore {
  flow: number;       // 0-10
  lyrics: number;     // 0-10
  delivery: number;   // 0-10
  total: number;
}

export interface JudgeResult {
  winnerId: string;
  analysis: string;
  scores: {
    challenger: JudgeScore;
    opponent: JudgeScore;
  };
  provider: "claude" | "openai";
}

function buildPrompt(challenger: BattlerInput, opponent: BattlerInput): string {
  return `You are an expert rap battle judge. Score these two rappers on their verses.

CHALLENGER (${challenger.name}):
"${challenger.lyrics}"

OPPONENT (${opponent.name}):
"${opponent.lyrics}"

Score each rapper on:
- Flow (0-10): rhythm, cadence, syllable placement
- Lyrics (0-10): wordplay, punchlines, metaphors, originality
- Delivery (0-10): energy, confidence, presence

Respond with ONLY valid JSON in this exact format:
{
  "winner": "${challenger.userId}",
  "analysis": "1-2 sentence breakdown of why the winner won",
  "scores": {
    "${challenger.userId}": { "flow": 8, "lyrics": 7, "delivery": 9, "total": 24 },
    "${opponent.userId}": { "flow": 6, "lyrics": 8, "delivery": 7, "total": 21 }
  }
}`;
}

export async function judgeWithClaude(
  challenger: BattlerInput,
  opponent: BattlerInput
): Promise<JudgeResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const msg = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 500,
    messages: [{ role: "user", content: buildPrompt(challenger, opponent) }],
  });

  const text = (msg.content[0] as { type: "text"; text: string }).text;
  const parsed = JSON.parse(text);

  return {
    winnerId: parsed.winner,
    analysis: parsed.analysis,
    scores: {
      challenger: parsed.scores[challenger.userId],
      opponent: parsed.scores[opponent.userId],
    },
    provider: "claude",
  };
}

export async function judgeWithOpenAI(
  challenger: BattlerInput,
  opponent: BattlerInput
): Promise<JudgeResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert rap battle judge. Always respond with valid JSON only." },
      { role: "user", content: buildPrompt(challenger, opponent) },
    ],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");

  return {
    winnerId: parsed.winner,
    analysis: parsed.analysis,
    scores: {
      challenger: parsed.scores[challenger.userId],
      opponent: parsed.scores[opponent.userId],
    },
    provider: "openai",
  };
}

export async function judgeAuto(
  challenger: BattlerInput,
  opponent: BattlerInput,
  preferredProvider: "claude" | "openai" = "claude"
): Promise<JudgeResult> {
  try {
    if (preferredProvider === "claude" && process.env.ANTHROPIC_API_KEY) {
      return await judgeWithClaude(challenger, opponent);
    }
    if (process.env.OPENAI_API_KEY) {
      return await judgeWithOpenAI(challenger, opponent);
    }
    if (process.env.ANTHROPIC_API_KEY) {
      return await judgeWithClaude(challenger, opponent);
    }
    throw new Error("No AI provider configured");
  } catch (err) {
    // Fallback to the other provider
    console.error(`[AI_JUDGE] ${preferredProvider} failed, trying fallback`, err);
    if (preferredProvider === "claude" && process.env.OPENAI_API_KEY) {
      return await judgeWithOpenAI(challenger, opponent);
    }
    if (process.env.ANTHROPIC_API_KEY) {
      return await judgeWithClaude(challenger, opponent);
    }
    throw err;
  }
}
