import { NextRequest } from "next/server";
import { buildQuestionsPrompt, buildMockInterviewPrompt } from "@/lib/prompts";

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

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_api_key_here") {
      return new Response(
        JSON.stringify({ error: "API key not configured. Add your Gemini API key to .env.local" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let prompt: string;

    if (mode === "mock") {
      prompt = buildMockInterviewPrompt(
        jobDescription,
        conversationHistory || "This is the start of the interview."
      );
    } else {
      prompt = buildQuestionsPrompt(jobDescription);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 16384,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API error:", response.status, errorData);

      let msg = `API error: ${response.status}`;
      if (errorData?.error?.message) {
        msg = errorData.error.message;
      } else if (response.status === 400) {
        msg = "Invalid request. Check your API key and try again.";
      } else if (response.status === 403) {
        msg = "API key invalid or quota exceeded. Check your Gemini API key.";
      } else if (response.status === 429) {
        msg = "Rate limit exceeded. Wait a moment and try again.";
      }

      return new Response(
        JSON.stringify({ error: msg }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Transform Gemini streaming response to our SSE format
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
  } catch (error) {
    console.error("API route error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Check your API key and try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
