import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface UserProfile {
  name: string;
  role: string;
  location: string;
  skills: string;
  experience: string;
  education: string;
  yearsExperience: string;
}

export interface CvResult {
  resume: string;
  coverLetter: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  role: "",
  location: "",
  skills: "",
  experience: "",
  education: "",
  yearsExperience: "",
};

interface UserContextValue {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  isLoaded: boolean;
  savedJobIds: number[];
  toggleSavedJob: (jobId: number, saved: boolean) => Promise<void>;
  cvResult: CvResult | null;
  saveCvResult: (result: CvResult | null) => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  profile: DEFAULT_PROFILE,
  updateProfile: async () => {},
  isLoaded: false,
  savedJobIds: [],
  toggleSavedJob: async () => {},
  cvResult: null,
  saveCvResult: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [savedJobIds, setSavedJobIds] = useState<number[]>([]);
  const [cvResult, setCvResult] = useState<CvResult | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("user_profile"),
      AsyncStorage.getItem("saved_job_ids"),
      AsyncStorage.getItem("cv_result"),
    ]).then(([rawProfile, rawSaved, rawCv]) => {
      if (rawProfile) {
        try {
          setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(rawProfile) });
        } catch {}
      }
      if (rawSaved) {
        try {
          const parsed = JSON.parse(rawSaved);
          if (Array.isArray(parsed)) setSavedJobIds(parsed);
        } catch {}
      }
      if (rawCv) {
        try {
          setCvResult(JSON.parse(rawCv));
        } catch {}
      }
      setIsLoaded(true);
    });
  }, []);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const next = { ...profile, ...updates };
    setProfile(next);
    await AsyncStorage.setItem("user_profile", JSON.stringify(next));
  };

  const toggleSavedJob = async (jobId: number, saved: boolean) => {
    const next = saved
      ? [...savedJobIds.filter((id) => id !== jobId), jobId]
      : savedJobIds.filter((id) => id !== jobId);
    setSavedJobIds(next);
    await AsyncStorage.setItem("saved_job_ids", JSON.stringify(next));
  };

  const saveCvResult = async (result: CvResult | null) => {
    setCvResult(result);
    if (result) {
      await AsyncStorage.setItem("cv_result", JSON.stringify(result));
    } else {
      await AsyncStorage.removeItem("cv_result");
    }
  };

  return (
    <UserContext.Provider
      value={{
        profile,
        updateProfile,
        isLoaded,
        savedJobIds,
        toggleSavedJob,
        cvResult,
        saveCvResult,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
