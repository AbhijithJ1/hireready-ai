import { NextRequest } from "next/server";
import { buildQuestionsPrompt, buildMockInterviewPrompt } from "@/lib/prompts";

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
    if ((configured.startsWith('"') && configured.endsWith('"')) || (configured.startsWith("'") && configured.endsWith("'"))) {
      configured = configured.slice(1, -1).trim();
    }
    if (configured.startsWith("GEMINI_MODEL=")) {
      configured = configured.slice("GEMINI_MODEL=".length).trim();
    }
    if (configured.startsWith("AIzaSy") || configured.startsWith("GEMINI_API_KEY=")) {
      console.warn("[generate] Stage: model_resolution — GEMINI_MODEL appears to contain an API key instead of a model name. Falling back to default model.");
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

  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim();
  }

  if (raw.startsWith("GEMINI_API_KEY=")) {
    raw = raw.slice("GEMINI_API_KEY=".length).trim();
  }

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
    let body: any;
    try {
      body = await req.json();
    } catch (err) {
      console.error("[generate] Stage: request_parse failed — Invalid JSON body:", err instanceof Error ? err.message : "Malformed body");
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body", stage: "request_parse" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { mode, jobDescription, conversationHistory } = body || {};

    if (!jobDescription || !jobDescription.trim()) {
      return new Response(
        JSON.stringify({ error: "Please paste a job description first.", stage: "payload_validation" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (jobDescription.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: "Job description seems too short. Paste the full listing for better results.", stage: "payload_validation" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const keyCheck = getApiKey();
    if (!keyCheck.isValid || !keyCheck.key) {
      console.error(`[generate] Stage: env_validation failed — Status: ${keyCheck.status}. GEMINI_API_KEY is not valid.`);
      return new Response(
        JSON.stringify({
          error: keyCheck.error || "GEMINI_API_KEY environment variable is not configured.",
          stage: "env_validation",
          code: keyCheck.status,
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
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

    console.log(`[generate] Stage: outbound_fetch_dispatch — model: '${model}', mode: '${mode || "questions"}'`);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": keyCheck.key,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 16384,
          },
        }),
      });
    } catch (fetchErr) {
      const errorMsg = fetchErr instanceof Error ? fetchErr.message : "Network error";
      console.error(`[generate] Stage: outbound_fetch_error — model: '${model}', error: ${errorMsg}`);
      return new Response(
        JSON.stringify({
          error: `Failed to connect to Google Gemini service (${errorMsg}).`,
          stage: "outbound_fetch",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate] Stage: outbound_fetch_response — model: '${model}', status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const upstreamMsg = errorData?.error?.message || "Unknown error";
      console.error(`[generate] Stage: upstream_gemini_error — model: '${model}', status: ${response.status}, message: ${upstreamMsg}`);

      let msg = `Gemini API error (${response.status}): ${upstreamMsg}`;
      if (response.status === 404) {
        msg = `The configured Gemini model '${model}' was not found. Please set GEMINI_MODEL to 'gemini-3.8-flash'.`;
      } else if (response.status === 401 || response.status === 403) {
        msg = "Gemini API key is invalid or lacks necessary permissions. Please verify your GEMINI_API_KEY in Vercel.";
      } else if (response.status === 429) {
        msg = "Gemini API rate limit exceeded. Please wait a moment and try again.";
      }

      return new Response(
        JSON.stringify({ error: msg, stage: "upstream_gemini", status: response.status }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Transform Gemini streaming response to SSE format
    const encoder = new TextEncoder();
    const reader = response.body?.getReader();
    if (!reader) {
      console.error(`[generate] Stage: stream_initiation_error — model: '${model}', response body is null`);
      return new Response(
        JSON.stringify({ error: "No response body received from Gemini API.", stage: "stream_initiation" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

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
          console.error(`[generate] Stage: stream_transform_error — model: '${model}', error:`, err instanceof Error ? err.message : err);
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
    console.error("[generate] Stage: unhandled_error —", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: "Internal server error occurred while processing generation request.", stage: "unhandled_exception" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
