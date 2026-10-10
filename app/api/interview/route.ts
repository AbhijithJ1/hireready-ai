import { NextRequest } from "next/server";
import {
  buildHireReadyStartPrompt,
  buildHireReadyEvaluatePrompt,
  buildPerformanceReportPrompt,
} from "@/lib/prompts";
import type { CandidateProfile, InterviewConfig } from "@/lib/types";

// Verified Gemini API configuration
const DEFAULT_MODEL = "gemini-3.8-flash";
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
    const {
      action,
      profile,
      config,
      conversationHistory,
      currentQuestionNumber,
      totalQuestions,
    } = body as {
      action: "start" | "evaluate" | "report";
      profile: CandidateProfile;
      config: InterviewConfig;
      conversationHistory?: string;
      currentQuestionNumber?: number;
      totalQuestions?: number;
    };

    const apiKey = getApiKey();
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "GEMINI_API_KEY environment variable is not configured. Please add your Gemini API key in Vercel project settings or .env.local.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!profile || !config) {
      return new Response(
        JSON.stringify({ error: "Candidate profile and interview config are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const model = getModel();
    let prompt: string;

    switch (action) {
      case "start":
        prompt = buildHireReadyStartPrompt(profile, config);
        break;
      case "evaluate":
        prompt = buildHireReadyEvaluatePrompt(
          profile,
          config,
          conversationHistory || "",
          currentQuestionNumber || 1,
          totalQuestions || config.numberOfQuestions
        );
        break;
      case "report":
        prompt = buildPerformanceReportPrompt(
          profile,
          config,
          conversationHistory || "",
          totalQuestions || config.numberOfQuestions
        );
        return await generateFullResponse(apiKey, model, prompt);
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Expected 'start', 'evaluate', or 'report'." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    // Stream response for start and evaluate actions
    return await generateStreamingResponse(apiKey, model, prompt);
  } catch (error) {
    console.error("Interview API internal error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({
        error: "Something went wrong. Please check your API configuration and try again.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function generateStreamingResponse(apiKey: string, model: string, prompt: string) {
  const endpoint = `${GEMINI_BASE_URL}/${API_VERSION}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 16384 },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const upstreamMsg = errorData?.error?.message || "Unknown error";
    console.error(`Gemini API streaming error [${response.status}] for model '${model}':`, upstreamMsg);

    let clientMsg = `Gemini API error (${response.status}): ${upstreamMsg}`;
    if (response.status === 404) {
      clientMsg = `The configured Gemini model '${model}' was not found. Please set GEMINI_MODEL to 'gemini-3.8-flash' or 'gemini-1.5-flash'.`;
    } else if (response.status === 401 || response.status === 403) {
      clientMsg = "Gemini API key is invalid or lacks necessary permissions. Please verify your GEMINI_API_KEY in Vercel.";
    } else if (response.status === 429) {
      clientMsg = "Gemini API rate limit exceeded. Please wait a moment and try again.";
    }

    return new Response(JSON.stringify({ error: clientMsg }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const reader = response.body?.getReader();
  if (!reader) {
    console.error("Gemini streaming error: response body is null");
    return new Response(
      JSON.stringify({ error: "No response body received from Gemini API." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
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
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                );
              }
            } catch {
              // skip malformed chunk
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
}

async function generateFullResponse(apiKey: string, model: string, prompt: string) {
  const endpoint = `${GEMINI_BASE_URL}/${API_VERSION}/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 16384 },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const upstreamMsg = errorData?.error?.message || "Unknown error";
    console.error(`Gemini API generateContent error [${response.status}] for model '${model}':`, upstreamMsg);

    let clientMsg = `Gemini API error (${response.status}): ${upstreamMsg}`;
    if (response.status === 404) {
      clientMsg = `The configured Gemini model '${model}' was not found. Please set GEMINI_MODEL to 'gemini-3.8-flash'.`;
    }

    return new Response(JSON.stringify({ error: clientMsg }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    console.error("Gemini API report error: missing text in response");
    return new Response(
      JSON.stringify({ error: "No response from AI model" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Clean up potential markdown code fences around JSON
  let cleanText = text.trim();
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.slice(7);
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.slice(3);
  }
  if (cleanText.endsWith("```")) {
    cleanText = cleanText.slice(0, -3);
  }
  cleanText = cleanText.trim();

  try {
    const parsed = JSON.parse(cleanText);
    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ rawText: cleanText }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
