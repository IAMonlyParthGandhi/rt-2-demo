import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Terminal, AlertCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SimulationDemo() {
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

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>PyBullet Simulation Runs Externally</AlertTitle>
          <AlertDescription>
            The PyBullet simulation runs separately in a Python terminal. Follow
            the instructions below to run the simulation on your machine.
          </AlertDescription>
        </Alert>

        <div className="bg-muted/30 rounded-lg p-8 mb-6 min-h-[500px] flex items-center justify-center border-2 border-dashed">
          <div className="text-center space-y-6 max-w-2xl">
            <div className="text-8xl">🤖</div>
            <h3 className="text-2xl font-bold tracking-tight">
              Run PyBullet Simulation Locally
            </h3>
            <div className="text-left space-y-4 bg-card p-6 rounded-lg border">
              <p className="font-semibold text-lg">Installation Steps:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Navigate to the Pybulllet folder</li>
                <li>
                  Install dependencies:{" "}
                  <code className="bg-muted px-2 py-1 rounded text-xs">
                    pip install -r requirements.txt
                  </code>
                </li>
                <li>
                  Run the simulation:{" "}
                  <code className="bg-muted px-2 py-1 rounded text-xs">
                    python Simullation.py
                  </code>
                </li>
              </ol>
              <p className="font-semibold text-lg mt-6">Example Commands:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>"pick up the red cube and place it on the ground"</li>
                <li>"put the blue block on the green cube"</li>
                <li>"grab the red cube and place it on the table"</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" asChild>
                <a
                  href="https://github.com/IAMonlyParthGandhi/rt-2-demo/blob/main/README.md#-pybullet-simulation-setup"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Setup Guide
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/20 p-4 rounded-lg">
          <p className="font-medium mb-2">📝 What the simulation does:</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <strong>CLIP Vision-Language Model:</strong> Understands natural
              language commands and identifies objects
            </li>
            <li>
              <strong>Action Tokenization:</strong> Converts continuous actions
              to discrete tokens (RT-2 format)
            </li>
            <li>
              <strong>8D Action Vectors:</strong> Generates control signals
              (terminate, x, y, z, roll, pitch, yaw, gripper)
            </li>
            <li>
              <strong>IK Control:</strong> KUKA iiwa robot arm performs
              pick-and-place operations
            </li>
            <li>
              <strong>Real-time Feedback:</strong> See token generation and
              execution steps in terminal
            </li>
          </ul>
        </div>
      </Card>
    </motion.div>
  );
}
