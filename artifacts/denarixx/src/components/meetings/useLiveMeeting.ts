import { useState } from "react";

export type ActiveMeeting = {
  token: string;
  serverUrl: string;
  roomName: string;
};

export function useLiveMeeting(basePath: string, getToken: () => Promise<string | null>) {
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeeting | null>(null);
  const [startingMeeting, setStartingMeeting] = useState(false);

  async function startMeeting(options: {
    roomName: string;
    displayName?: string;
    meetingType?: "direct" | "community" | "webinar";
    avatarUrl?: string | null;
  }) {
    setStartingMeeting(true);

    try {
      const token = await getToken();

      const res = await fetch(`${basePath}/api/meetings/token`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(options),
      });

      if (!res.ok) {
        alert(await res.text());
        return;
      }

      const data = await res.json();

      setActiveMeeting({
        token: data.token,
        serverUrl: data.url,
        roomName: data.roomName,
      });
    } finally {
      setStartingMeeting(false);
    }
  }

  function endMeeting() {
    setActiveMeeting(null);
  }

  return {
    activeMeeting,
    startingMeeting,
    startMeeting,
    endMeeting,
  };
}
