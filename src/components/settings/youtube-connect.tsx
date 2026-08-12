"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function YoutubeConnect({ connected }: { connected: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/youtube/oauth");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start OAuth");
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error("No auth URL returned");
      }
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  }

  if (connected) {
    return (
      <Button size="sm" variant="outline" disabled>
        <Check className="h-4 w-4" />
        Connected
      </Button>
    );
  }

  return (
    <Button size="sm" onClick={handleConnect} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Link2 className="h-4 w-4" />
      )}
      Connect
    </Button>
  );
}
