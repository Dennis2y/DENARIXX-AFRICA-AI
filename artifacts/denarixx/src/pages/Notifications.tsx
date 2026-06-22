import { useAuth, useUser } from "@clerk/react";
import { Link, Redirect } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function Notifications() {
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ notifications: AppNotification[] }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${basePath}/api/notifications`, {
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) return { notifications: [] };
      return res.json();
    },
    refetchInterval: 15_000,
  });

  if (isLoaded && !isSignedIn) return <Redirect to="/sign-in" />;

  const notifications = data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.isRead).length;

  async function markRead(notification: AppNotification) {
    const token = await getToken();
    await fetch(`${basePath}/api/notifications/${notification.id}/read`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    await qc.invalidateQueries({ queryKey: ["notifications"] });
    await qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });

    if (notification.href) {
      window.location.href = `${basePath}${notification.href}`;
    }
  }

  async function markAllRead() {
    const token = await getToken();
    await fetch(`${basePath}/api/notifications/read-all`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    await qc.invalidateQueries({ queryKey: ["notifications"] });
    await qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            Dashboard
          </Link>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={unread === 0}
            className="gap-2 rounded-xl"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <main className="container mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">{unread} unread notification{unread === 1 ? "" : "s"}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
            <Bell className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => markRead(notification)}
                className={`w-full rounded-2xl border p-4 text-left transition hover:border-primary/40 hover:bg-muted/40 ${
                  notification.isRead ? "border-border bg-card" : "border-primary/30 bg-primary/5"
                }`}
              >
                <div className="flex gap-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${notification.isRead ? "bg-muted" : "bg-primary"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-semibold">{notification.title}</h2>
                      <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {notification.body && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{notification.body}</p>
                    )}
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-primary/80">{notification.type.replaceAll("_", " ")}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
