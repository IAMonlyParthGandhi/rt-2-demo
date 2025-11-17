import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

export default function ActionTokenizer() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState(0);
  const [gripper, setGripper] = useState(0.5);
  const [result, setResult] = useState<{
    bins: { x: number; y: number; z: number; gripper: number };
    tokens: number[];
  } | null>(null);

  const tokenizeMutation = useMutation(api.tokenization.tokenize);
  const createExample = useMutation(api.tokenization.create);

  const handleTokenize = async () => {
    try {
      const tokenized = await tokenizeMutation({ x, y, z, gripper });
      setResult(tokenized);
      
      await createExample({
        action: { x, y, z, gripper },
        tokens: tokenized.tokens,
        bins: tokenized.bins,
      });
      
      toast.success("Action tokenized successfully");
    } catch (error) {
      toast.error("Failed to tokenize action");
    }
  };

  const handleReset = () => {
    setX(0);
    setY(0);
    setZ(0);
    setGripper(0.5);
    setResult(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full"
    >
      <Card className="p-8 border-2">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Action Tokenization Visualizer</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-3 block">Continuous Action Space</Label>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">X Position</span>
                    <span className="text-sm font-mono">{x.toFixed(3)}</span>
                  </div>
                  <Slider
                    value={[x]}
                    onValueChange={(val) => setX(val[0])}
                    min={-1}
                    max={1}
                    step={0.01}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Y Position</span>
                    <span className="text-sm font-mono">{y.toFixed(3)}</span>
                  </div>
                  <Slider
                    value={[y]}
                    onValueChange={(val) => setY(val[0])}
                    min={-1}
                    max={1}
                    step={0.01}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Z Position</span>
                    <span className="text-sm font-mono">{z.toFixed(3)}</span>
                  </div>
                  <Slider
                    value={[z]}
                    onValueChange={(val) => setZ(val[0])}
                    min={-1}
                    max={1}
                    step={0.01}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Gripper</span>
                    <span className="text-sm font-mono">{gripper.toFixed(3)}</span>
                  </div>
                  <Slider
                    value={[gripper]}
                    onValueChange={(val) => setGripper(val[0])}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleTokenize} className="flex-1">
                <ArrowRight className="h-4 w-4 mr-2" />
                Tokenize
              </Button>
              <Button onClick={handleReset} variant="outline">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Output Section */}
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-3 block">Discrete Token Space</Label>
              
              {result ? (
                <div className="space-y-4">
                  <div className="bg-muted/30 rounded-lg p-4 border">
                    <p className="text-xs text-muted-foreground mb-2">Bins (0-255)</p>
                    <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                      <div>X: {result.bins.x}</div>
                      <div>Y: {result.bins.y}</div>
                      <div>Z: {result.bins.z}</div>
                      <div>Gripper: {result.bins.gripper}</div>
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 border">
                    <p className="text-xs text-muted-foreground mb-2">Token IDs</p>
                    <div className="space-y-1 text-sm font-mono">
                      {result.tokens.map((token, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {["X", "Y", "Z", "Gripper"][idx]}:
                          </span>
                          <span>{token}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted/20 rounded p-3">
                    <p className="font-medium mb-1">How it works:</p>
                    <p>Continuous values [-1, 1] are discretized into 256 bins, then offset by the base vocabulary size (32000) to create unique token IDs.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/20 rounded-lg p-8 border-2 border-dashed flex items-center justify-center min-h-[300px]">
                  <p className="text-sm text-muted-foreground text-center">
                    Adjust the sliders and click "Tokenize"<br />to see the conversion
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
