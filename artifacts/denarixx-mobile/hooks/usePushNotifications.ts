import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

const PUSH_TOKEN_KEY = "push_token_pending";

const getBaseUrl = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "http://localhost:80";
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const existing = (await Notifications.getPermissionsAsync()) as unknown as {
    granted: boolean;
    ios?: { status: number };
  };
  let isGranted = existing.granted;

  if (!isGranted) {
    const result = (await Notifications.requestPermissionsAsync()) as unknown as {
      granted: boolean;
    };
    isGranted = result.granted;
  }

  if (!isGranted) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("application-updates", {
      name: "Application Updates",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6C63FF",
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

async function saveTokenToBackend(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/users/push-token`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
    if (!res.ok) {
      console.warn(
        `[PushNotifications] Token registration failed (HTTP ${res.status}) — will retry on next foreground`,
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[PushNotifications] Token registration error:", err);
    return false;
  }
}

async function registerAndPersist(): Promise<void> {
  const token = await registerForPushNotificationsAsync();
  if (!token) return;

  const ok = await saveTokenToBackend(token);
  if (!ok) {
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  }
}

async function retryPendingToken(): Promise<void> {
  try {
    const pending = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!pending) return;
    const ok = await saveTokenToBackend(pending);
    if (ok) {
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  } catch {
  }
}

export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerAndPersist();

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        retryPendingToken();
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {});

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<
          string,
          unknown
        >;
        if (typeof data?.jobId === "number") {
          router.push(`/job/${data.jobId}` as any);
        } else {
          router.push("/(tabs)/applications" as any);
        }
      });

    return () => {
      appStateSub.remove();
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
