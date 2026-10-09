"use client";

import { useState, useRef, useEffect } from "react";
import { GradientWave } from "@/components/ui/gradient-wave";

interface Message {
  role: "user" | "ai";
  content: string;
}

export default function PracticePage() {
  const [jobDescription, setJobDescription] = useState("");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startInterview = () => {
    if (!jobDescription.trim()) return;
    setStarted(true);
    setQuestionCount(1);
    setMessages([
      {
        role: "ai",
        content:
          "Let's begin the mock interview. I'll ask you questions one at a time and score your answers.\n\nFirst question: Tell me about yourself and why you're interested in this role.",
      },
    ]);
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim() || loading) return;

    const userMsg = { role: "user" as const, content: userAnswer.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setUserAnswer("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "mock",
          jobDescription,
          conversationHistory: newMessages
            .map((m) => `${m.role === "user" ? "Candidate" : "Coach"}: ${m.content}`)
            .join("\n\n"),
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      let hasError = false;

      const aiMsg = { role: "ai" as const, content: "" };
      setMessages([...newMessages, aiMsg]);

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
            if (parsed.error) {
              fullText = "Error: " + parsed.error;
              setMessages([...newMessages, { role: "ai", content: fullText }]);
              hasError = true;
              break;
            }
            if (typeof parsed.text === "string") {
              fullText += parsed.text;
              setMessages([...newMessages, { role: "ai", content: fullText }]);
            }
          } catch {
            // skip
          }
        }

        if (hasError) break;
      }

      if (!hasError && fullText) {
        setQuestionCount((c) => c + 1);
      }
      if (!fullText) {
        setMessages([
          ...newMessages,
          { role: "ai", content: "Sorry, I couldn't generate a response. Please try again." },
        ]);
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "ai",
          content: "Sorry, something went wrong. Let's try that again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!started) {
    return (
      <main id="practice-start-root" className="relative min-h-screen">
        <GradientWave
          colors={["#0a0a0a", "#1a1030", "#0f0a1a", "#1a1030", "#0a0a0a", "#1a1030"]}
          shadowPower={8}
          darkenTop={false}
        />
        <section id="practice-start-content" className="relative z-10 max-w-4xl mx-auto px-4 py-10">
          <header id="practice-start-header">
            <h1 id="practice-start-title" className="text-2xl font-bold text-white mb-2">
              Mock Interview
            </h1>
            <p id="practice-start-description" className="text-gray-400 mb-6">
              Paste the job description to conduct a mock interview.
            </p>
          </header>

          <form id="practice-start-form" onSubmit={(e) => { e.preventDefault(); startInterview(); }}>
            <textarea
              id="practice-jd"
              name="practice-jd"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className="w-full h-40 p-4 border border-white/10 bg-white/5 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm text-white placeholder-gray-500 mb-4"
            />

            <button
              id="practice-start-btn"
              type="submit"
              disabled={!jobDescription.trim()}
              className="bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Interview
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main id="practice-active-root" className="relative min-h-screen">
      <GradientWave
        colors={["#0a0a0a", "#1a1030", "#0f0a1a", "#1a1030", "#0a0a0a", "#1a1030"]}
        shadowPower={8}
        darkenTop={false}
      />
      <section id="practice-active-content" className="relative z-10 max-w-4xl mx-auto px-4 py-10">
        <header id="practice-header" className="flex items-center justify-between mb-6">
          <h1 id="practice-active-title" className="text-2xl font-bold text-white">
            Mock Interview
          </h1>
          <nav id="practice-header-controls" className="flex items-center gap-3">
            <span id="practice-question-count" className="text-sm text-gray-400">
              Question {questionCount}
            </span>
            <button
              id="practice-start-over-btn"
              onClick={() => {
                setStarted(false);
                setMessages([]);
                setQuestionCount(0);
                setUserAnswer("");
              }}
              className="text-xs text-gray-400 hover:text-white underline"
            >
              Start over
            </button>
          </nav>
        </header>

        <ul id="practice-chat-scroll" className="space-y-3 mb-4 max-h-[55vh] sm:max-h-[60vh] overflow-y-auto list-none p-0 m-0" role="log" aria-live="polite">
          {messages.map((msg, i) => (
            <li
              id={`practice-message-${i}`}
              key={i}
              className={`p-3 sm:p-4 rounded-lg ${
                msg.role === "user"
                  ? "bg-purple-500/10 border border-purple-500/20 ml-4 sm:ml-8"
                  : "bg-white/5 border border-white/10 mr-4 sm:mr-8"
              }`}
            >
              <p id={`practice-message-role-${i}`} className="text-xs font-medium text-gray-400 mb-1">
                {msg.role === "user" ? "You" : "Coach"}
              </p>
              <article id={`practice-message-content-${i}`} className="text-sm text-gray-200 leading-relaxed">
                {msg.content.split("\n").map((line, li) => {
                  if (!line.trim()) return <br key={li} />;
                  const parts = line.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <span key={li} className="block mb-1">
                      {parts.map((part, pi) => {
                        if (part.startsWith("**") && part.endsWith("**")) {
                          return <strong key={pi} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
                        }
                        return <span key={pi}>{part}</span>;
                      })}
                    </span>
                  );
                })}
              </article>
            </li>
          ))}

          {loading && messages[messages.length - 1]?.role === "user" && (
            <li id="practice-loading-message" className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4 mr-4 sm:mr-8">
              <div id="practice-loading-inner" className="flex items-center gap-2">
                <div id="practice-spinner" className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                <span id="practice-loading-text" className="text-sm text-gray-400">Thinking...</span>
              </div>
            </li>
          )}

          <div id="practice-chat-end" ref={chatEndRef} />
        </ul>

        <form id="practice-input-form" className="flex gap-2 sm:gap-3" onSubmit={(e) => { e.preventDefault(); submitAnswer(); }}>
          <textarea
            id="answer"
            name="answer"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your answer..."
            className="flex-1 p-3 border border-white/10 bg-white/5 rounded-lg resize-none h-20 sm:h-24 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm text-white placeholder-gray-500"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                submitAnswer();
              }
            }}
            disabled={loading}
          />
          <button
            id="practice-submit-btn"
            type="submit"
            disabled={!userAnswer.trim() || loading}
            className="self-end bg-white text-black px-4 sm:px-5 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Submit
          </button>
        </form>
        <p id="practice-hint" className="text-xs text-gray-500 mt-1">
          Press Ctrl+Enter to submit
        </p>
      </section>
    </main>
  );
}
