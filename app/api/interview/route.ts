import { NextRequest } from "next/server";
import {
  buildHireReadyStartPrompt,
  buildHireReadyEvaluatePrompt,
  buildPerformanceReportPrompt,
} from "@/lib/prompts";
import type { CandidateProfile, InterviewConfig } from "@/lib/types";

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return new Response(
        JSON.stringify({
          error:
            "API key not configured. Add your Gemini API key to .env.local",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!profile || !config) {
      return new Response(
        JSON.stringify({ error: "Profile and config are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

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
        // For report, we don't stream — we need the full JSON response
        return await generateFullResponse(apiKey, prompt);
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Use: start, evaluate, report" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    // Stream response for start and evaluate actions
    return await generateStreamingResponse(apiKey, prompt);
  } catch (error) {
    console.error("Interview API error:", error);
    return new Response(
      JSON.stringify({
        error: "Something went wrong. Check your API key and try again.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function generateStreamingResponse(apiKey: string, prompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 16384 },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Gemini API error:", response.status, errorData);
    const msg = errorData?.error?.message || `API error: ${response.status}`;
    return new Response(JSON.stringify({ error: msg }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

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
              const text =
                parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                );
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("Stream transform error:", err);
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

async function generateFullResponse(apiKey: string, prompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 16384 },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Gemini API error:", response.status, errorData);
    const msg = errorData?.error?.message || `API error: ${response.status}`;
    return new Response(JSON.stringify({ error: msg }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return new Response(
      JSON.stringify({ error: "No response from AI model" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
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
    // If JSON parsing fails, return raw text for the client to handle
    return new Response(JSON.stringify({ rawText: cleanText }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
