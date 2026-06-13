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

export interface ParsedCvData {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  currentRole: string;
  targetRole: string;
  summary: string;
  experience: string;
  education: string;
  achievements: string;
  languages: string;
  skills: string[];
}

export type ImportCvRequest =
  | { fileBase64: string; filename: string }
  | { cvText: string };

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

export function useImportCv() {
  return useMutation({
    mutationFn: async (payload: ImportCvRequest): Promise<ParsedCvData> => {
      const res = await fetch(`${getBaseUrl()}/api/cv-builder/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `Import failed: ${res.status}`);
      }
      return data as ParsedCvData;
    },
  });
}
