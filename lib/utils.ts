import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { subjectsColors, voices } from "@/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getSubjectColor = (subject: string) => {
  return subjectsColors[subject as keyof typeof subjectsColors];
};

// Use specific ElevenLabs agent ID
export const getElevenLabsAgentId = () => {
  return "agent_1201k38p1ktse719v80971j3g4cm";
};
