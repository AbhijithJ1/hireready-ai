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

interface ApiKeyValidation {
  key: string | null;
  isValid: boolean;
  status: "ok" | "missing" | "placeholder" | "model_assigned_as_key";
  error?: string;
}

function getModel(): string {
  let configured = process.env.GEMINI_MODEL?.trim();
  if (configured) {
    // Strip quotes if present
    if ((configured.startsWith('"') && configured.endsWith('"')) || (configured.startsWith("'") && configured.endsWith("'"))) {
      configured = configured.slice(1, -1).trim();
    }
    // Strip accidental variable assignment prefix
    if (configured.startsWith("GEMINI_MODEL=")) {
      configured = configured.slice("GEMINI_MODEL=".length).trim();
    }
    // Safeguard: Never treat an API key as a model name
    if (configured.startsWith("AIzaSy") || configured.startsWith("GEMINI_API_KEY=")) {
      console.warn("[interview] Stage: model_resolution — GEMINI_MODEL appears to contain an API key instead of a model name. Falling back to default model.");
      return DEFAULT_MODEL;
    }
    if (configured) return configured;
  }
  return DEFAULT_MODEL;
}

function getApiKey(): ApiKeyValidation {
  let raw = process.env.GEMINI_API_KEY?.trim();
  if (!raw) {
    return {
      key: null,
      isValid: false,
      status: "missing",
      error: "GEMINI_API_KEY is not configured in the server environment. Please set GEMINI_API_KEY in your Vercel project settings.",
    };
  }

  // Strip enclosing quotes
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim();
  }

  // Strip accidentally prefixed variable assignment
  if (raw.startsWith("GEMINI_API_KEY=")) {
    raw = raw.slice("GEMINI_API_KEY=".length).trim();
  }

  // Detect if GEMINI_MODEL was mistakenly set as GEMINI_API_KEY
  if (raw.startsWith("GEMINI_MODEL=") || raw.startsWith("gemini-")) {
    return {
      key: null,
      isValid: false,
      status: "model_assigned_as_key",
      error: "GEMINI_API_KEY is misconfigured: it appears to contain a model identifier ('" + raw.slice(0, 20) + "...') instead of a Gemini API key. Please check your Vercel environment variables.",
    };
  }

  if (raw === "your_api_key_here") {
    return {
      key: null,
      isValid: false,
      status: "placeholder",
      error: "GEMINI_API_KEY is still set to placeholder 'your_api_key_here'. Please set your real Gemini API key in Vercel project settings.",
    };
  }

  return {
    key: raw,
    isValid: true,
    status: "ok",
  };
}

export async function POST(req: NextRequest) {
  try {
    // Stage 1: Request parsing
    let body: any;
    try {
      body = await req.json();
    } catch (err) {
      console.error("[interview] Stage: request_parse failed — Invalid JSON body:", err instanceof Error ? err.message : "Malformed body");
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body", stage: "request_parse" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!body || typeof body !== "object") {
      console.error("[interview] Stage: payload_validation failed — Body is empty or not an object");
      return new Response(
        JSON.stringify({ error: "Request body must be a valid JSON object", stage: "payload_validation" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const {
      action,
      profile,
      config,
      conversationHistory,
      currentQuestionNumber,
      totalQuestions,
    } = body as {
      action?: string;
      profile?: CandidateProfile;
      config?: InterviewConfig;
      conversationHistory?: string;
      currentQuestionNumber?: number;
      totalQuestions?: number;
    };

    // Stage 2: Payload field validation
    if (!action || !["start", "evaluate", "report"].includes(action)) {
      console.error(`[interview] Stage: payload_validation failed — Invalid action: '${action}'`);
      return new Response(
        JSON.stringify({ error: "Invalid action. Expected 'start', 'evaluate', or 'report'.", stage: "payload_validation" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!profile || typeof profile !== "object" || !config || typeof config !== "object") {
      console.error("[interview] Stage: payload_validation failed — Missing candidate profile or interview config");
      return new Response(
        JSON.stringify({ error: "Candidate profile and interview config are required.", stage: "payload_validation" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stage 3: Environment & API key validation
    const keyCheck = getApiKey();
    if (!keyCheck.isValid || !keyCheck.key) {
      console.error(`[interview] Stage: env_validation failed — Status: ${keyCheck.status}. GEMINI_API_KEY is not valid.`);
      return new Response(
        JSON.stringify({
          error: keyCheck.error || "GEMINI_API_KEY environment variable is not configured.",
          stage: "env_validation",
          code: keyCheck.status,
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stage 4: Model resolution
    const model = getModel();

    // Stage 5: Prompt generation
    let prompt: string;
    try {
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
            totalQuestions || config.numberOfQuestions || 5
          );
          break;
        case "report":
          prompt = buildPerformanceReportPrompt(
            profile,
            config,
            conversationHistory || "",
            totalQuestions || config.numberOfQuestions || 5
          );
          return await generateFullResponse(keyCheck.key, model, prompt);
        default:
          throw new Error(`Unhandled action: ${action}`);
      }
    } catch (err) {
      console.error(`[interview] Stage: prompt_generation failed — model: '${model}', error:`, err instanceof Error ? err.message : err);
      return new Response(
        JSON.stringify({
          error: "Failed to construct interview prompt from provided profile and configuration.",
          stage: "prompt_generation",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stage 6: Stream response for start and evaluate actions
    return await generateStreamingResponse(keyCheck.key, model, prompt, action);
  } catch (error) {
    console.error("[interview] Stage: unhandled_error —", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({
        error: "Internal server error occurred while processing interview request.",
        stage: "unhandled_exception",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function generateStreamingResponse(apiKey: string, model: string, prompt: string, action: string) {
  const endpoint = `${GEMINI_BASE_URL}/${API_VERSION}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

  console.log(`[interview] Stage: outbound_fetch_dispatch — model: '${model}', action: '${action}'`);

  let response: Response;
  try {
    response = await fetch(endpoint, {
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
  } catch (fetchErr) {
    const errorMsg = fetchErr instanceof Error ? fetchErr.message : "Network error";
    console.error(`[interview] Stage: outbound_fetch_error — model: '${model}', error: ${errorMsg}`);
    return new Response(
      JSON.stringify({
        error: `Failed to connect to Google Gemini service (${errorMsg}).`,
        stage: "outbound_fetch",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(`[interview] Stage: outbound_fetch_response — model: '${model}', status: ${response.status}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const upstreamMsg = errorData?.error?.message || "Unknown error";
    console.error(`[interview] Stage: upstream_gemini_error — model: '${model}', status: ${response.status}, message: ${upstreamMsg}`);

    let clientMsg = `Gemini API error (${response.status}): ${upstreamMsg}`;
    if (response.status === 404) {
      clientMsg = `The configured Gemini model '${model}' was not found. Please set GEMINI_MODEL to 'gemini-3.8-flash' or 'gemini-1.5-flash'.`;
    } else if (response.status === 401 || response.status === 403) {
      clientMsg = "Gemini API key is invalid or lacks necessary permissions. Please verify your GEMINI_API_KEY in Vercel.";
    } else if (response.status === 429) {
      clientMsg = "Gemini API rate limit exceeded. Please wait a moment and try again.";
    }

    return new Response(JSON.stringify({ error: clientMsg, stage: "upstream_gemini", status: response.status }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const reader = response.body?.getReader();
  if (!reader) {
    console.error(`[interview] Stage: stream_initiation_error — model: '${model}', response body is null`);
    return new Response(
      JSON.stringify({ error: "No response body received from Gemini API.", stage: "stream_initiation" }),
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
        console.error(`[interview] Stage: stream_transform_error — model: '${model}', error:`, err instanceof Error ? err.message : err);
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

  console.log(`[interview] Stage: outbound_fetch_dispatch (report) — model: '${model}'`);

  let response: Response;
  try {
    response = await fetch(endpoint, {
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
  } catch (fetchErr) {
    const errorMsg = fetchErr instanceof Error ? fetchErr.message : "Network error";
    console.error(`[interview] Stage: outbound_fetch_error (report) — model: '${model}', error: ${errorMsg}`);
    return new Response(
      JSON.stringify({ error: `Failed to connect to Google Gemini service (${errorMsg}).`, stage: "outbound_fetch" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(`[interview] Stage: outbound_fetch_response (report) — model: '${model}', status: ${response.status}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const upstreamMsg = errorData?.error?.message || "Unknown error";
    console.error(`[interview] Stage: upstream_gemini_error (report) — model: '${model}', status: ${response.status}, message: ${upstreamMsg}`);

    let clientMsg = `Gemini API error (${response.status}): ${upstreamMsg}`;
    if (response.status === 404) {
      clientMsg = `The configured Gemini model '${model}' was not found. Please set GEMINI_MODEL to 'gemini-3.8-flash'.`;
    }

    return new Response(JSON.stringify({ error: clientMsg, stage: "upstream_gemini", status: response.status }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    console.error(`[interview] Stage: empty_response (report) — model: '${model}'`);
    return new Response(
      JSON.stringify({ error: "No response text received from Gemini model.", stage: "response_parsing" }),
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
