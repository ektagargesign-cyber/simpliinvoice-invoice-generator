import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CloudOff, RefreshCw, LogOut } from "lucide-react";
import { connect, disconnect, isConnected } from "@/lib/googleAuth";
import { syncNow, getLastSyncedAt } from "@/lib/driveSync";
import { toast } from "sonner";

interface Props {
  /** Called after any successful sync that may have changed local data,
   * so parent components can re-read storage and refresh their state. */
  onSynced?: () => void;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "not yet synced";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "synced just now";
  if (mins < 60) return `synced ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `synced ${hrs}h ago`;
  return `synced ${new Date(iso).toLocaleDateString()}`;
}

export const GoogleSyncButton = ({ onSynced }: Props) => {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  useEffect(() => {
    setConnected(isConnected());
    setLastSynced(getLastSyncedAt());
  }, []);

  const handleConnect = async () => {
    setSyncing(true);
    try {
      await connect();
      setConnected(true);
      const result = await syncNow();
      setLastSynced(result.syncedAt);
      toast.success("Connected — your data is now synced to Google Drive");
      onSynced?.();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't connect to Google Drive. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncNow();
      setLastSynced(result.syncedAt);
      toast.success(result.direction === "pulled" ? "Pulled the latest data from Drive" : "Synced to Drive");
      onSynced?.();
    } catch (err) {
      console.error(err);
      toast.error("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setConnected(false);
    toast.success("Disconnected from Google Drive");
  };

  if (!connected) {
    return (
      <Button variant="outline" onClick={handleConnect} disabled={syncing}>
        <CloudOff className="mr-2 h-4 w-4" />
        {syncing ? "Connecting..." : "Connect Google Drive"}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" onClick={handleSync} disabled={syncing}>
        <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : formatRelative(lastSynced)}
      </Button>
      <Button variant="ghost" size="icon" onClick={handleDisconnect} title="Disconnect Google Drive">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
};
