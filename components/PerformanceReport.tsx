"use client";

import { motion } from "framer-motion";
import type { PerformanceReport } from "@/lib/types";

interface Props {
  report: PerformanceReport;
  onStartOver: () => void;
}

function ScoreRing({ score, maxScore, size = 120 }: { score: number; maxScore: number; size?: number }) {
  const percentage = Math.round((score / maxScore) * 100);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 80
      ? "#22c55e"
      : percentage >= 60
      ? "#eab308"
      : percentage >= 40
      ? "#f97316"
      : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={10} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute text-center">
        <motion.span
          className="text-2xl font-bold text-white block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {percentage}%
        </motion.span>
      </div>
    </div>
  );
}

function GradeDisplay({ grade }: { grade: string }) {
  const gradeColors: Record<string, string> = {
    "A+": "from-green-400 to-emerald-600",
    A: "from-green-500 to-emerald-600",
    "B+": "from-lime-400 to-green-600",
    B: "from-yellow-400 to-lime-600",
    "C+": "from-yellow-500 to-orange-500",
    C: "from-orange-400 to-orange-600",
    D: "from-red-400 to-orange-600",
    F: "from-red-500 to-red-700",
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
      className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${gradeColors[grade] || "from-gray-400 to-gray-600"} shadow-lg`}
    >
      <span className="text-2xl font-black text-white">{grade}</span>
    </motion.div>
  );
}

function CategoryBar({ label, score, maxScore }: { label: string; score: number; maxScore: number }) {
  const pct = Math.round((score / maxScore) * 100);
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : pct >= 40 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-400">
          {score}/{maxScore}
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
        />
      </div>
    </div>
  );
}

export function PerformanceReportView({ report, onStartOver }: Props) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <h1 className="text-2xl font-bold text-white">📊 Performance Report</h1>
        <p className="text-sm text-gray-400">
          {report.candidateName} • {report.targetRole}
        </p>
      </motion.header>

      {/* Score Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/5 border border-white/10 rounded-xl p-6"
      >
        <div className="flex items-center justify-center gap-8 flex-wrap">
          <ScoreRing score={report.overallScore} maxScore={report.maxScore} />
          <div className="space-y-2 text-center sm:text-left">
            <GradeDisplay grade={report.grade} />
            <div className="space-y-1 mt-3">
              <p className="text-xs text-gray-400">
                Questions: {report.questionsAnswered}/{report.totalQuestions}
              </p>
              <p className="text-xs text-gray-400">Duration: {formatDuration(report.duration)}</p>
            </div>
          </div>
        </div>
        {report.summary && (
          <p className="text-sm text-gray-300 mt-4 text-center leading-relaxed border-t border-white/10 pt-4">
            {report.summary}
          </p>
        )}
      </motion.div>

      {/* Category Scores */}
      {report.categoryScores.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Category Scores</h2>
          <div className="space-y-3">
            {report.categoryScores.map((cs) => (
              <CategoryBar key={cs.category} label={cs.category} score={cs.score} maxScore={cs.maxScore} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {report.topStrengths.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-green-500/5 border border-green-500/20 rounded-xl p-5"
          >
            <h2 className="text-sm font-semibold text-green-400 mb-3">💪 Top Strengths</h2>
            <ul className="space-y-2">
              {report.topStrengths.map((s, i) => (
                <li key={i} className="text-xs text-gray-300 flex gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {report.topImprovements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5"
          >
            <h2 className="text-sm font-semibold text-orange-400 mb-3">🎯 Areas to Improve</h2>
            <ul className="space-y-2">
              {report.topImprovements.map((s, i) => (
                <li key={i} className="text-xs text-gray-300 flex gap-2">
                  <span className="text-orange-400 mt-0.5">→</span>
                  {s}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      {/* Question-by-Question Breakdown */}
      {report.evaluations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white/5 border border-white/10 rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Question-by-Question Breakdown</h2>
          <div className="space-y-4">
            {report.evaluations.map((ev, i) => (
              <details key={i} className="group border border-white/10 rounded-lg overflow-hidden">
                <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium flex items-center justify-center flex-shrink-0">
                      {ev.questionNumber || i + 1}
                    </span>
                    <span className="text-sm text-gray-200 line-clamp-1">{ev.question}</span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                      ev.score >= 8
                        ? "bg-green-500/20 text-green-400"
                        : ev.score >= 6
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {ev.score}/{ev.maxScore}
                  </span>
                </summary>
                <div className="p-3 pt-0 border-t border-white/10 space-y-2">
                  <p className="text-xs text-gray-400">{ev.feedback}</p>
                  {ev.strengths.length > 0 && (
                    <div>
                      <p className="text-[10px] text-green-400 font-medium mb-1">Strengths:</p>
                      <ul className="space-y-0.5">
                        {ev.strengths.map((s, si) => (
                          <li key={si} className="text-[10px] text-gray-400 pl-3">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {ev.improvements.length > 0 && (
                    <div>
                      <p className="text-[10px] text-orange-400 font-medium mb-1">To Improve:</p>
                      <ul className="space-y-0.5">
                        {ev.improvements.map((s, si) => (
                          <li key={si} className="text-[10px] text-gray-400 pl-3">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </motion.div>
      )}

      {/* Improvement Plan */}
      {report.improvementPlan.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="bg-gradient-to-br from-purple-500/5 to-indigo-500/5 border border-purple-500/20 rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-purple-300 mb-4">🗓️ Personalized Improvement Plan</h2>
          <div className="space-y-4">
            {report.improvementPlan.map((item, i) => (
              <div key={i} className="border border-white/10 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-white">{item.area}</h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      item.priority === "high"
                        ? "bg-red-500/20 text-red-400"
                        : item.priority === "medium"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {item.priority} priority
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mb-2">
                  {item.currentLevel} → {item.targetLevel} • {item.timeframe}
                </p>
                <ul className="space-y-1">
                  {item.actionItems.map((action, ai) => (
                    <li key={ai} className="text-xs text-gray-300 flex gap-2">
                      <span className="text-purple-400">▸</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="flex flex-col sm:flex-row gap-3 pt-2"
      >
        <button
          id="print-report-btn"
          onClick={() => window.print()}
          className="flex-1 py-3 border border-white/10 text-gray-300 rounded-lg font-medium text-sm hover:bg-white/5 transition-colors"
        >
          🖨️ Print Report
        </button>
        <button
          id="start-over-btn"
          onClick={onStartOver}
          className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium text-sm hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/20"
        >
          🔄 Start New Interview
        </button>
      </motion.div>
    </div>
  );
}
