import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Hash, Loader2, Play, RefreshCw, Terminal } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { PYBULLET_API_BASE, resolvePybulletEndpoint } from "@/lib/config";

type SimulationResult = {
  command: string;
  pick_uid: number | null;
  place_uid: number | null;
  drop_position: [number, number, number] | null;
  status: string;
  session_id?: string;
  [key: string]: unknown;
};

export default function SimulationDemo() {
  const [command, setCommand] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SimulationResult | null>(null);

  const simulateEndpoint = resolvePybulletEndpoint("/api/simulate");
  const resetEndpoint = resolvePybulletEndpoint("/api/reset");

  const handleRunSimulation = async () => {
    if (!command.trim()) {
      toast.error("Please enter a command");
      return;
    }

    setIsRunning(true);
    setErrorMessage(null);
    try {
      const response = await fetch(simulateEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command: command.trim() }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to run simulation");
      }

      const payload = (await response.json()) as {
        frame?: string | null;
        debug?: Record<string, unknown>;
        pick_uid?: number | null;
        place_uid?: number | null;
        drop_position?: [number, number, number] | null;
        message?: string;
        session_id?: string;
        status?: string;
      };

      setFrameUrl(
        payload.frame ? `data:image/png;base64,${payload.frame}` : null,
      );
      setLastResult({
        command: command.trim(),
        pick_uid: payload.pick_uid ?? null,
        place_uid: payload.place_uid ?? null,
        drop_position: payload.drop_position ?? null,
        status: payload.status ?? "complete",
        session_id: payload.session_id ?? undefined,
        ...(payload.debug ?? {}),
      });

      toast.success(payload.message ?? "Simulation completed");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to run simulation";
      setErrorMessage(message);
      toast.error("Simulation failed", { description: message });
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetScene = async () => {
    setIsResetting(true);
    setErrorMessage(null);
    try {
      const response = await fetch(resetEndpoint, {
        method: "POST",
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to reset scene");
      }
      toast.success("Simulation reset");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reset scene";
      setErrorMessage(message);
      toast.error("Reset failed", { description: message });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full"
    >
      <Card className="p-8 border-2">
        <div className="flex items-center gap-3 mb-6">
          <Terminal className="h-6 w-6" />
          <h2 className="text-2xl font-bold tracking-tight">
            RT-2 Simulation Demo
          </h2>
        </div>

        <div className="bg-muted/30 rounded-lg p-6 mb-6 min-h-[500px] flex items-center justify-center border-2 border-dashed">
          {frameUrl ? (
            <img
              src={frameUrl}
              alt="PyBullet simulation frame"
              className="max-h-[460px] max-w-full rounded-lg border shadow-lg"
            />
          ) : (
            <div className="text-center text-muted-foreground space-y-3">
              <div className="text-8xl">🤖</div>
              <p className="text-lg font-medium">
                Run a natural language command to capture the latest PyBullet
                frame.
              </p>
              <p className="text-sm opacity-70">
                Backend endpoint: {PYBULLET_API_BASE}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Enter natural language command (e.g., 'pick up the red block')"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isRunning) {
                  handleRunSimulation();
                }
              }}
              disabled={isRunning}
              className="flex-1"
              id="simulation-command"
            />
            <Button
              onClick={handleRunSimulation}
              disabled={isRunning}
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Running
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetScene}
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Resetting
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset scene
                </>
              )}
            </Button>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive">
              {errorMessage}
            </div>
          )}

          {lastResult && (
            <div className="rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground space-y-2">
              <p className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <Hash className="h-3.5 w-3.5" />
                Latest debug snapshot
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p>
                    Command:{" "}
                    <span className="font-medium text-foreground">
                      {lastResult.command}
                    </span>
                  </p>
                  <p>Pick UID: {String(lastResult.pick_uid)}</p>
                  <p>Place UID: {String(lastResult.place_uid)}</p>
                  {lastResult.drop_position !== null && (
                    <p>Drop: {JSON.stringify(lastResult.drop_position)}</p>
                  )}
                </div>
                <div className="space-y-1">
                  {Object.entries(lastResult)
                    .filter(
                      ([key]) =>
                        ![
                          "command",
                          "pick_uid",
                          "place_uid",
                          "drop_position",
                        ].includes(key),
                    )
                    .map(([key, value]) => {
                      const displayValue =
                        typeof value === "object" && value !== null
                          ? JSON.stringify(value)
                          : String(value);
                      return (
                        <p key={key}>
                          {key}: {displayValue}
                        </p>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-2">Example commands:</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>"Pick up the red cube and place it on the blue platform"</li>
              <li>"Move the object to the left"</li>
              <li>"Grasp the bottle and lift it up"</li>
            </ul>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
