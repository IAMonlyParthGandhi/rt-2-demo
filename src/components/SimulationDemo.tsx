import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Loader2, Play, Terminal } from "lucide-react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

export default function SimulationDemo() {
  const [command, setCommand] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const createSimulation = useMutation(api.simulations.create);

  const handleRunSimulation = async () => {
    if (!command.trim()) {
      toast.error("Please enter a command");
      return;
    }

    setIsRunning(true);
    try {
      await createSimulation({
        command: command,
        status: "pending",
      });
      
      toast.success("Simulation request sent", {
        description: "Connect your PyBullet backend to process this command",
      });
      
      // Simulate processing time
      setTimeout(() => {
        setIsRunning(false);
      }, 2000);
    } catch (error) {
      toast.error("Failed to create simulation");
      setIsRunning(false);
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
          <h2 className="text-2xl font-bold tracking-tight">RT-2 Simulation Demo</h2>
        </div>
        
        <div className="bg-muted/30 rounded-lg p-6 mb-6 min-h-[300px] flex items-center justify-center border-2 border-dashed">
          <div className="text-center">
            <div className="text-6xl mb-4">🤖</div>
            <p className="text-muted-foreground text-sm">
              PyBullet simulation viewport
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              Connect your PyBullet backend to display simulation here
            </p>
          </div>
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
          </div>

          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-2">Example commands:</p>
            <ul className="space-y-1 ml-4">
              <li>• "Pick up the red cube and place it on the blue platform"</li>
              <li>• "Move the object to the left"</li>
              <li>• "Grasp the bottle and lift it up"</li>
            </ul>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
