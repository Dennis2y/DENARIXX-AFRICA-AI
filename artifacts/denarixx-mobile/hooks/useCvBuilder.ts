import { useMutation } from "@tanstack/react-query";

export interface CvGenerateRequest {
  name: string;
  targetRole: string;
  yearsExperience: number;
  location: string;
  skills: string[];
  education: string;
  experience: string;
  tone?: string;
}

export interface CvGenerateResponse {
  resume: string;
  coverLetter: string;
}

const getBaseUrl = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "http://localhost:80";
};

export function useGenerateCv() {
  return useMutation({
    mutationFn: async (
      payload: CvGenerateRequest
    ): Promise<CvGenerateResponse> => {
      const res = await fetch(`${getBaseUrl()}/api/cv-builder/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`CV generation failed: ${res.status}`);
      return res.json();
    },
  });
}
