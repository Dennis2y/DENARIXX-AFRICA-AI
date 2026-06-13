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
}

const UserContext = createContext<UserContextValue>({
  profile: DEFAULT_PROFILE,
  updateProfile: async () => {},
  isLoaded: false,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("user_profile").then((raw) => {
      if (raw) {
        try {
          setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(raw) });
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

  return (
    <UserContext.Provider value={{ profile, updateProfile, isLoaded }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
