export interface AiPreferences {
  tone: "professional" | "friendly" | "formal" | "casual";
  creativity: number;
  response_length: "short" | "medium" | "long";
  language: string;
  preferred_model: string;
}

export const DEFAULT_PREFERENCES: AiPreferences = {
  tone: "professional",
  creativity: 0.7,
  response_length: "medium",
  language: "en",
  preferred_model: "google/gemini-2.5-flash",
};

export interface AiMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
}
