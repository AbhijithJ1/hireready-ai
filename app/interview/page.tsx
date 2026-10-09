"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GradientWave } from "@/components/ui/gradient-wave";
import type {
  CandidateProfile,
  InterviewConfig,
  InterviewMessage,
  PerformanceReport,
} from "@/lib/types";
import { PerformanceReportView } from "@/components/PerformanceReport";

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({
  currentStep,
}: {
  currentStep: "profile" | "config" | "interview" | "report";
}) {
  const steps = [
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "config", label: "Configure", icon: "⚙️" },
    { id: "interview", label: "Interview", icon: "🎙️" },
    { id: "report", label: "Report", icon: "📊" },
  ];

  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <nav id="step-indicator" className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
              i <= currentIndex
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "bg-white/5 text-gray-500 border border-white/10"
            }`}
          >
            <span>{step.icon}</span>
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-6 sm:w-10 h-px mx-1 transition-colors duration-300 ${
                i < currentIndex ? "bg-purple-500/50" : "bg-white/10"
              }`}
            />
          )}
        </div>
      ))}
    </nav>
  );
}

// ─── Profile Setup Form ──────────────────────────────────────────────────────

function ProfileSetup({
  onComplete,
}: {
  onComplete: (profile: CandidateProfile) => void;
}) {
  const [name, setName] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<CandidateProfile["experienceLevel"]>("fresher");
  const [targetRole, setTargetRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState(0);
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetRole.trim()) return;
    onComplete({
      name: name.trim(),
      experienceLevel,
      targetRole: targetRole.trim(),
      industry: industry.trim() || "General",
      yearsOfExperience,
      keySkills: skills.length > 0 ? skills : ["Communication", "Problem Solving"],
    });
  };

  return (
    <motion.form
      id="profile-form"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5"
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="candidate-name" className="block text-sm font-medium text-gray-300 mb-1.5">
            Your Name *
          </label>
          <input
            id="candidate-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Abhijeet"
            className="w-full p-3 border border-white/10 bg-white/5 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label htmlFor="target-role" className="block text-sm font-medium text-gray-300 mb-1.5">
            Target Role *
          </label>
          <input
            id="target-role"
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g., Software Engineer"
            className="w-full p-3 border border-white/10 bg-white/5 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label htmlFor="experience-level" className="block text-sm font-medium text-gray-300 mb-1.5">
            Experience Level
          </label>
          <select
            id="experience-level"
            value={experienceLevel}
            onChange={(e) =>
              setExperienceLevel(e.target.value as CandidateProfile["experienceLevel"])
            }
            className="w-full p-3 border border-white/10 bg-white/5 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="fresher" className="bg-gray-900">Fresher (0 years)</option>
            <option value="junior" className="bg-gray-900">Junior (1-2 years)</option>
            <option value="mid" className="bg-gray-900">Mid-Level (3-5 years)</option>
            <option value="senior" className="bg-gray-900">Senior (6+ years)</option>
          </select>
        </div>

        <div>
          <label htmlFor="years-experience" className="block text-sm font-medium text-gray-300 mb-1.5">
            Years of Experience
          </label>
          <input
            id="years-experience"
            type="number"
            min={0}
            max={30}
            value={yearsOfExperience}
            onChange={(e) => setYearsOfExperience(parseInt(e.target.value) || 0)}
            className="w-full p-3 border border-white/10 bg-white/5 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="industry" className="block text-sm font-medium text-gray-300 mb-1.5">
            Industry
          </label>
          <input
            id="industry"
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g., Technology, Finance, Healthcare"
            className="w-full p-3 border border-white/10 bg-white/5 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="skill-input" className="block text-sm font-medium text-gray-300 mb-1.5">
            Key Skills
          </label>
          <div className="flex gap-2">
            <input
              id="skill-input"
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Type a skill and press Enter"
              className="flex-1 p-3 border border-white/10 bg-white/5 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={addSkill}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              Add
            </button>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/15 text-purple-300 rounded-full text-xs font-medium border border-purple-500/20"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="hover:text-white transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        id="profile-submit-btn"
        type="submit"
        disabled={!name.trim() || !targetRole.trim()}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium text-sm hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
      >
        Continue to Configuration →
      </button>
    </motion.form>
  );
}

// ─── Interview Configuration Form ────────────────────────────────────────────

function ConfigSetup({
  profile,
  onComplete,
  onBack,
}: {
  profile: CandidateProfile;
  onComplete: (config: InterviewConfig) => void;
  onBack: () => void;
}) {
  const [difficulty, setDifficulty] = useState<InterviewConfig["difficulty"]>("medium");
  const [category, setCategory] = useState<InterviewConfig["category"]>("mixed");
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [jobDescription, setJobDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      difficulty,
      category,
      numberOfQuestions,
      jobDescription: jobDescription.trim() || `${profile.targetRole} position in ${profile.industry}`,
    });
  };

  const difficultyOptions = [
    { value: "easy", label: "Easy", desc: "Foundational questions, encouraging tone", emoji: "🟢" },
    { value: "medium", label: "Medium", desc: "Balanced challenge with follow-ups", emoji: "🟡" },
    { value: "hard", label: "Hard", desc: "Deep, nuanced probing questions", emoji: "🔴" },
  ];

  const categoryOptions = [
    { value: "mixed", label: "Mixed", desc: "Behavioral + Technical + HR" },
    { value: "behavioral", label: "Behavioral", desc: "STAR-based situational questions" },
    { value: "technical", label: "Technical", desc: "Domain-specific competencies" },
    { value: "hr", label: "HR / Culture", desc: "Motivation, teamwork, goals" },
  ];

  return (
    <motion.form
      id="config-form"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
      onSubmit={handleSubmit}
    >
      {/* Candidate summary */}
      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <p className="text-sm text-purple-300">
          👤 <strong>{profile.name}</strong> — {profile.experienceLevel} ({profile.yearsOfExperience} yrs) → {profile.targetRole}
        </p>
      </div>

      {/* Difficulty */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty Level</label>
        <div className="grid grid-cols-3 gap-2">
          {difficultyOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDifficulty(opt.value as InterviewConfig["difficulty"])}
              className={`p-3 rounded-lg border text-center transition-all ${
                difficulty === opt.value
                  ? "border-purple-500 bg-purple-500/15 text-white"
                  : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
              }`}
            >
              <span className="text-lg">{opt.emoji}</span>
              <p className="text-sm font-medium mt-1">{opt.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 hidden sm:block">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Question Category</label>
        <div className="grid grid-cols-2 gap-2">
          {categoryOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCategory(opt.value as InterviewConfig["category"])}
              className={`p-3 rounded-lg border text-left transition-all ${
                category === opt.value
                  ? "border-purple-500 bg-purple-500/15 text-white"
                  : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
              }`}
            >
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Number of questions */}
      <div>
        <label htmlFor="num-questions" className="block text-sm font-medium text-gray-300 mb-1.5">
          Number of Questions: <span className="text-purple-400">{numberOfQuestions}</span>
        </label>
        <input
          id="num-questions"
          type="range"
          min={3}
          max={10}
          value={numberOfQuestions}
          onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
          className="w-full accent-purple-500"
        />
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>3 (Quick)</span>
          <span>10 (Thorough)</span>
        </div>
      </div>

      {/* Job Description */}
      <div>
        <label htmlFor="jd-config" className="block text-sm font-medium text-gray-300 mb-1.5">
          Job Description <span className="text-gray-500">(optional — makes questions more specific)</span>
        </label>
        <textarea
          id="jd-config"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here for more tailored questions..."
          className="w-full h-28 p-3 border border-white/10 bg-white/5 rounded-lg resize-none text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3 border border-white/10 text-gray-400 rounded-lg font-medium text-sm hover:bg-white/5 transition-colors"
        >
          ← Back
        </button>
        <button
          id="config-submit-btn"
          type="submit"
          className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium text-sm hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/20"
        >
          🎙️ Start Interview
        </button>
      </div>
    </motion.form>
  );
}

// ─── Interview Chat ──────────────────────────────────────────────────────────

function InterviewChat({
  profile,
  config,
  onComplete,
}: {
  profile: CandidateProfile;
  config: InterviewConfig;
  onComplete: (messages: InterviewMessage[], report: PerformanceReport) => void;
}) {
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Start the interview on mount
  useEffect(() => {
    startInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startInterview = async () => {
    setLoading(true);
    startTimeRef.current = Date.now();

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          profile,
          config,
        }),
      });

      if (!res.ok) throw new Error("Failed to start interview");

      const text = await readStream(res);
      if (text) {
        const aiMsg: InterviewMessage = {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: text,
          timestamp: Date.now(),
          questionNumber: 1,
        };
        setMessages([aiMsg]);
        setQuestionCount(1);
      }
    } catch {
      setMessages([
        {
          id: `ai-error-${Date.now()}`,
          role: "ai",
          content: "Sorry, I couldn't start the interview. Please check your API key and try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const readStream = async (res: Response): Promise<string> => {
    const reader = res.body?.getReader();
    if (!reader) return "";

    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

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
          if (typeof parsed.text === "string") {
            fullText += parsed.text;
          }
        } catch {
          // skip
        }
      }
    }

    return fullText;
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim() || loading || interviewEnded) return;

    const userMsg: InterviewMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userAnswer.trim(),
      timestamp: Date.now(),
      questionNumber: questionCount,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setUserAnswer("");
    setLoading(true);

    try {
      const conversationHistory = newMessages
        .map((m) => `${m.role === "user" ? "Candidate" : "HireReady AI"}: ${m.content}`)
        .join("\n\n");

      const nextQuestionNum = questionCount + 1;
      const isLast = questionCount >= config.numberOfQuestions;

      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate",
          profile,
          config,
          conversationHistory,
          currentQuestionNumber: questionCount,
          totalQuestions: config.numberOfQuestions,
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const text = await readStream(res);
      if (text) {
        // Parse score from the response
        const scoreMatch = text.match(/\*\*Score:\*\*\s*(\d+)\/10/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : undefined;

        const aiMsg: InterviewMessage = {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: text,
          timestamp: Date.now(),
          questionNumber: isLast ? questionCount : nextQuestionNum,
          score,
        };

        setMessages([...newMessages, aiMsg]);

        if (isLast) {
          setInterviewEnded(true);
        } else {
          setQuestionCount(nextQuestionNum);
        }
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          id: `ai-error-${Date.now()}`,
          role: "ai",
          content: "Sorry, something went wrong. Let's try that again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const generateReport = useCallback(async () => {
    setGeneratingReport(true);

    const conversationHistory = messages
      .map((m) => `${m.role === "user" ? "Candidate" : "HireReady AI"}: ${m.content}`)
      .join("\n\n");

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report",
          profile,
          config,
          conversationHistory,
          totalQuestions: config.numberOfQuestions,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate report");

      const data = await res.json();

      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

      const report: PerformanceReport = {
        candidateName: profile.name,
        targetRole: profile.targetRole,
        overallScore: data.overallScore || 0,
        maxScore: 100,
        percentage: data.overallScore || 0,
        grade: calculateGrade(data.overallScore || 0),
        totalQuestions: config.numberOfQuestions,
        questionsAnswered: config.numberOfQuestions,
        duration,
        evaluations: data.evaluations || [],
        categoryScores: (data.categoryScores || []).map(
          (cs: { category: string; score: number; maxScore: number }) => ({
            ...cs,
            percentage: Math.round((cs.score / cs.maxScore) * 100),
          })
        ),
        topStrengths: data.topStrengths || [],
        topImprovements: data.topImprovements || [],
        improvementPlan: data.improvementPlan || [],
        summary: data.summary || "Report generated successfully.",
      };

      onComplete(messages, report);
    } catch {
      // Fallback: generate a basic report from available data
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const scores = messages
        .filter((m) => m.score !== undefined)
        .map((m) => m.score!);
      const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) : 50;

      const report: PerformanceReport = {
        candidateName: profile.name,
        targetRole: profile.targetRole,
        overallScore: avgScore,
        maxScore: 100,
        percentage: avgScore,
        grade: calculateGrade(avgScore),
        totalQuestions: config.numberOfQuestions,
        questionsAnswered: scores.length,
        duration,
        evaluations: [],
        categoryScores: [],
        topStrengths: ["Participated in the full interview"],
        topImprovements: ["Review the detailed feedback from each question"],
        improvementPlan: [],
        summary: "Performance report generated from interview scores.",
      };

      onComplete(messages, report);
    } finally {
      setGeneratingReport(false);
    }
  }, [messages, profile, config, onComplete]);

  return (
    <motion.div
      id="interview-chat"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Mock Interview in Progress</h2>
          <p className="text-xs text-gray-400">
            {profile.name} • {profile.targetRole} • {config.difficulty} difficulty
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-purple-400 font-medium">
            Q{questionCount}/{config.numberOfQuestions}
          </span>
          {/* Progress bar */}
          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${(questionCount / config.numberOfQuestions) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Chat */}
      <ul
        id="interview-messages"
        className="space-y-3 mb-4 max-h-[50vh] sm:max-h-[55vh] overflow-y-auto list-none p-0 m-0 scroll-smooth"
        role="log"
        aria-live="polite"
      >
        {messages.map((msg) => (
          <li
            key={msg.id}
            className={`p-3 sm:p-4 rounded-lg ${
              msg.role === "user"
                ? "bg-purple-500/10 border border-purple-500/20 ml-4 sm:ml-8"
                : "bg-white/5 border border-white/10 mr-4 sm:mr-8"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-400">
                {msg.role === "user" ? `${profile.name} (You)` : "🤖 HireReady AI"}
              </p>
              {msg.score !== undefined && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    msg.score >= 8
                      ? "bg-green-500/20 text-green-400"
                      : msg.score >= 6
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {msg.score}/10
                </span>
              )}
            </div>
            <article className="text-sm text-gray-200 leading-relaxed">
              {msg.content.split("\n").map((line, li) => {
                if (!line.trim()) return <br key={li} />;
                const parts = line.split(/(\*\*[^*]+\*\*)/g);
                return (
                  <span key={li} className="block mb-1">
                    {parts.map((part, pi) => {
                      if (part.startsWith("**") && part.endsWith("**")) {
                        return (
                          <strong key={pi} className="text-white font-semibold">
                            {part.slice(2, -2)}
                          </strong>
                        );
                      }
                      return <span key={pi}>{part}</span>;
                    })}
                  </span>
                );
              })}
            </article>
          </li>
        ))}

        {loading && (
          <li className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4 mr-4 sm:mr-8">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-sm text-gray-400">
                {messages.length === 0 ? "Preparing your interview..." : "Evaluating your answer..."}
              </span>
            </div>
          </li>
        )}

        <div ref={chatEndRef} />
      </ul>

      {/* Input */}
      {interviewEnded ? (
        <div className="text-center space-y-4 py-6">
          <div className="text-2xl">🎉</div>
          <p className="text-white font-medium">Interview Complete!</p>
          <p className="text-sm text-gray-400">
            You answered all {config.numberOfQuestions} questions. Let&apos;s generate your detailed performance report.
          </p>
          <button
            id="generate-report-btn"
            onClick={generateReport}
            disabled={generatingReport}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium text-sm hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            {generatingReport ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                Generating Report...
              </span>
            ) : (
              "📊 Generate Performance Report"
            )}
          </button>
        </div>
      ) : (
        <form
          id="interview-input-form"
          className="flex gap-2 sm:gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submitAnswer();
          }}
        >
          <textarea
            ref={textareaRef}
            id="interview-answer"
            name="interview-answer"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="flex-1 p-3 border border-white/10 bg-white/5 rounded-lg resize-none h-20 sm:h-24 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm text-white placeholder-gray-500"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                submitAnswer();
              }
            }}
            disabled={loading || messages.length === 0}
          />
          <button
            id="interview-submit-btn"
            type="submit"
            disabled={!userAnswer.trim() || loading || messages.length === 0}
            className="self-end bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 sm:px-5 py-2.5 rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-purple-500/20"
          >
            Submit
          </button>
        </form>
      )}
      {!interviewEnded && (
        <p className="text-xs text-gray-500 mt-1">Press Ctrl+Enter to submit</p>
      )}
    </motion.div>
  );
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function calculateGrade(percentage: number): PerformanceReport["grade"] {
  if (percentage >= 95) return "A+";
  if (percentage >= 85) return "A";
  if (percentage >= 78) return "B+";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C+";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function HireReadyPage() {
  const [step, setStep] = useState<"profile" | "config" | "interview" | "report">("profile");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [report, setReport] = useState<PerformanceReport | null>(null);

  const handleProfileComplete = (p: CandidateProfile) => {
    setProfile(p);
    setStep("config");
  };

  const handleConfigComplete = (c: InterviewConfig) => {
    setConfig(c);
    setStep("interview");
  };

  const handleInterviewComplete = (_messages: InterviewMessage[], r: PerformanceReport) => {
    setReport(r);
    setStep("report");
  };

  const handleStartOver = () => {
    setStep("profile");
    setProfile(null);
    setConfig(null);
    setReport(null);
  };

  return (
    <main id="hireready-root" className="relative min-h-screen">
      <GradientWave
        colors={["#0a0a0a", "#1a1030", "#0f0a1a", "#1a1030", "#0a0a0a", "#1a1030"]}
        shadowPower={8}
        darkenTop={false}
      />
      <section id="hireready-content" className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        <StepIndicator currentStep={step} />

        <AnimatePresence mode="wait">
          {step === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <header className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-1">👤 Tell us about yourself</h1>
                <p className="text-sm text-gray-400">
                  We&apos;ll personalize your interview experience based on your profile.
                </p>
              </header>
              <ProfileSetup onComplete={handleProfileComplete} />
            </motion.div>
          )}

          {step === "config" && profile && (
            <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <header className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-1">⚙️ Configure Your Interview</h1>
                <p className="text-sm text-gray-400">
                  Choose the difficulty, question type, and paste a job description.
                </p>
              </header>
              <ConfigSetup
                profile={profile}
                onComplete={handleConfigComplete}
                onBack={() => setStep("profile")}
              />
            </motion.div>
          )}

          {step === "interview" && profile && config && (
            <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <InterviewChat
                profile={profile}
                config={config}
                onComplete={handleInterviewComplete}
              />
            </motion.div>
          )}

          {step === "report" && report && (
            <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PerformanceReportView report={report} onStartOver={handleStartOver} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
