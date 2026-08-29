import { getEnv, isGeminiEnabled } from "@/lib/env";
import { LeadRecord } from "@/lib/types";

function normalizeResponseText(data: any) {
  if (!data) return "";
  const candidate = data?.candidates?.[0];
  if (candidate?.content?.[0]?.text) return candidate.content[0].text;
  if (candidate?.output?.[0]?.content?.[0]?.text) return candidate.output[0].content[0].text;
  if (typeof candidate?.text === "string") return candidate.text;
  return "";
}

export async function generateGeminiEmail(lead: LeadRecord) {
  if (!isGeminiEnabled()) {
    throw new Error("Gemini integration is not configured. Set GEMINI_API_KEY.");
  }
  const env = getEnv();
  const geminiUrl = `https://gemini.googleapis.com/v1/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateText`;

  const prompt = `Create a highly relevant outreach email for a YouTube creator.

Channel name: ${lead.channelName}
Subscriber count: ${lead.subscribers}
Country: ${lead.country || "Unknown"}
Channel age: ${lead.ageInYears.toFixed(1)} years
Website: ${lead.website || "None"}
Email: ${lead.email || "None"}
Description: ${lead.description || "No description available."}

Write:
- One subject line
- A personalized email body with a friendly introduction, value proposition, and a clear call to action.
- A short lead summary and quality analysis in plain text after the body.

Return the results as JSON with keys subject, body, summary, analysis.`;

  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GEMINI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: {
        text: prompt,
      },
      temperature: 0.7,
      maxOutputTokens: 500,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${text}`);
  }

  const payload = await response.json();
  const content = normalizeResponseText(payload);
  if (!content) {
    throw new Error("Gemini returned no usable text.");
  }

  let subject = "Partnering opportunity for your channel";
  let body = "Hello,\n\nI wanted to reach out with a growth opportunity for your channel.";
  let summary = "No summary available.";
  let analysis = "No analysis available.";

  try {
    const parsed = JSON.parse(content);
    subject = parsed.subject ?? subject;
    body = parsed.body ?? body;
    summary = parsed.summary ?? summary;
    analysis = parsed.analysis ?? analysis;
  } catch {
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length > 0) {
      subject = lines[0].slice(0, 120);
      body = lines.slice(1).join("\n");
    } else {
      body = content;
    }
  }

  return { subject, body, summary, analysis };
}
