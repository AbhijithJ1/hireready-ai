import { NextRequest } from "next/server";
import { buildQuestionsPrompt, buildMockInterviewPrompt } from "@/lib/prompts";

const DEFAULT_MODEL = "gemini-2.0-flash";
const API_VERSION = "v1beta";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";

function getModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim();
  return configured || DEFAULT_MODEL;
}

function getApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === "your_api_key_here") {
    return null;
  }
  return key;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, jobDescription, conversationHistory } = body;

    if (!jobDescription || !jobDescription.trim()) {
      return new Response(
        JSON.stringify({ error: "Please paste a job description first." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (jobDescription.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: "Job description seems too short. Paste the full listing for better results." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured. Add your Gemini API key to .env.local or Vercel Environment Variables." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const model = getModel();
    let prompt: string;

    if (mode === "mock") {
      prompt = buildMockInterviewPrompt(
        jobDescription,
        conversationHistory || "This is the start of the interview."
      );
    } else {
      prompt = buildQuestionsPrompt(jobDescription);
    }

    const endpoint = `${GEMINI_BASE_URL}/${API_VERSION}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 16384,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const upstreamMsg = errorData?.error?.message || "Unknown error";
      console.error(`Gemini API error [${response.status}] for model '${model}':`, upstreamMsg);

      let msg = `API error: ${response.status}`;
      if (response.status === 404) {
        msg = `The configured Gemini model '${model}' was not found. Please set GEMINI_MODEL to 'gemini-2.0-flash'.`;
      } else if (response.status === 401 || response.status === 403) {
        msg = "API key invalid or quota exceeded. Check your Gemini API key in Vercel.";
      } else if (response.status === 429) {
        msg = "Rate limit exceeded. Wait a moment and try again.";
      } else if (upstreamMsg) {
        msg = upstreamMsg;
      }

      return new Response(
        JSON.stringify({ error: msg }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Transform Gemini streaming response to SSE format
    const encoder = new TextEncoder();
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const readable = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("Stream transform error:", err instanceof Error ? err.message : err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API route error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Check your API key and try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
