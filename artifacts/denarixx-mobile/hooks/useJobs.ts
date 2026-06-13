import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  requiredSkills: string[];
  salary: string | null;
  jobType: string;
  level: string;
  matchScore?: number;
  isActive: boolean;
}

export interface Application {
  id: number;
  jobId: number;
  userId: number;
  status: string;
  coverLetter: string | null;
  appliedAt: string;
  job?: Job;
}

const getBaseUrl = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "http://localhost:80";
};

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: async () => {
      const data = await apiFetch("/api/jobs");
      return Array.isArray(data) ? data : data.jobs ?? [];
    },
    retry: 1,
  });
}

export function useJob(id: number) {
  return useQuery<Job>({
    queryKey: ["job", id],
    queryFn: () => apiFetch(`/api/jobs/${id}`),
    enabled: id > 0,
  });
}

export function useApplications() {
  return useQuery<Application[]>({
    queryKey: ["applications"],
    queryFn: async () => {
      const data = await apiFetch("/api/jobs/my-applications");
      return Array.isArray(data) ? data : data.applications ?? [];
    },
    retry: 1,
  });
}

export function useApplyToJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      coverLetter,
    }: {
      jobId: number;
      coverLetter?: string;
    }) =>
      apiFetch(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        body: JSON.stringify({ coverLetter }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useSaveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, save }: { jobId: number; save: boolean }) =>
      apiFetch(`/api/jobs/${jobId}/save`, {
        method: save ? "POST" : "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["saved-jobs"] });
    },
  });
}

export function useGenerateCoverLetter() {
  return useMutation({
    mutationFn: ({ jobId }: { jobId: number }) =>
      apiFetch(`/api/jobs/${jobId}/cover-letter`, { method: "POST" }),
  });
}

export function useMatchExplain() {
  return useMutation({
    mutationFn: ({ jobId }: { jobId: number }) =>
      apiFetch(`/api/jobs/${jobId}/match-explain`, { method: "POST" }),
  });
}
