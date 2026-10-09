// ─── Candidate Profile ────────────────────────────────────────────────────────

export interface CandidateProfile {
  name: string;
  experienceLevel: "fresher" | "junior" | "mid" | "senior";
  targetRole: string;
  industry: string;
  yearsOfExperience: number;
  keySkills: string[];
}

// ─── Interview Configuration ──────────────────────────────────────────────────

export interface InterviewConfig {
  difficulty: "easy" | "medium" | "hard";
  category: "behavioral" | "technical" | "hr" | "mixed";
  numberOfQuestions: number;
  jobDescription: string;
}

// ─── Interview Session ────────────────────────────────────────────────────────

export interface InterviewMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: number;
  questionNumber?: number;
  score?: number;
  feedback?: string;
}

export interface QuestionEvaluation {
  questionNumber: number;
  question: string;
  answer: string;
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  category: string;
}

export interface InterviewSession {
  id: string;
  profile: CandidateProfile;
  config: InterviewConfig;
  messages: InterviewMessage[];
  evaluations: QuestionEvaluation[];
  status: "setup" | "in-progress" | "completed";
  startTime: number;
  endTime?: number;
}

// ─── Performance Report ───────────────────────────────────────────────────────

export interface PerformanceReport {
  candidateName: string;
  targetRole: string;
  overallScore: number;
  maxScore: number;
  percentage: number;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";
  totalQuestions: number;
  questionsAnswered: number;
  duration: number; // in seconds
  evaluations: QuestionEvaluation[];
  categoryScores: {
    category: string;
    score: number;
    maxScore: number;
    percentage: number;
  }[];
  topStrengths: string[];
  topImprovements: string[];
  improvementPlan: ImprovementItem[];
  summary: string;
}

export interface ImprovementItem {
  area: string;
  currentLevel: string;
  targetLevel: string;
  actionItems: string[];
  priority: "high" | "medium" | "low";
  timeframe: string;
}
