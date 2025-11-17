import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionSlider } from "./tokenizer/ActionSlider";
import { TokenDisplay } from "./tokenizer/TokenDisplay";
import { TokenBreakdown } from "./tokenizer/TokenBreakdown";
import { PrecisionIndicator } from "./tokenizer/PrecisionIndicator";
import { PresetButtons } from "./tokenizer/PresetButtons";

interface ActionState {
  terminate: number;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  gripper: number;
}

interface TokenResult {
  bins: ActionState;
  tokens: number[];
}

const dimensionColors = {
  terminate: "bg-gray-500",
  x: "bg-red-500",
  y: "bg-green-500",
  z: "bg-blue-500",
  rx: "bg-red-300",
  ry: "bg-green-300",
  rz: "bg-blue-300",
  gripper: "bg-purple-500",
};

export default function ActionTokenizer() {
  const [action, setAction] = useState<ActionState>({
    terminate: 0,
    x: 0,
    y: 0,
    z: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    gripper: 0,
  });
  const [result, setResult] = useState<TokenResult | null>(null);

  const tokenizeMutation = useMutation(api.tokenization.tokenize);
  const createExample = useMutation(api.tokenization.create);

  const handleTokenize = async () => {
    try {
      const tokenized = await tokenizeMutation(action);
      setResult(tokenized);
      
      await createExample({
        action,
        tokens: tokenized.tokens,
        bins: tokenized.bins,
      });
      
      toast.success("Action tokenized successfully");
    } catch (error) {
      toast.error("Failed to tokenize action");
    }
  };

  const handleReset = () => {
    setAction({ terminate: 0, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, gripper: 0 });
    setResult(null);
  };

  const handlePreset = (preset: ActionState) => {
    setAction(preset);
    setResult(null);
  };

  const getReconstructedValue = (bin: number) => {
    return Math.round(((bin / 127.5) - 1.0) * 1000) / 1000;
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
        
        <PresetButtons onPresetSelect={handlePreset} onReset={handleReset} />

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-4 block">Continuous Action Space</Label>
              
              <div className="space-y-5">
                {/* Terminate */}
                <div className="p-4 rounded-lg border-2 border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="text-sm font-medium">Terminate Episode</span>
                      <p className="text-xs text-muted-foreground">Should robot stop?</p>
                    </div>
                    <Switch
                      checked={action.terminate === 1}
                      onCheckedChange={(checked) => setAction({ ...action, terminate: checked ? 1 : 0 })}
                    />
                  </div>
                </div>

                <ActionSlider
                  label="X-axis (forward/backward)"
                  description="Translation in meters"
                  value={action.x}
                  onChange={(x) => setAction({ ...action, x })}
                  min={-1}
                  max={1}
                  step={0.01}
                  unit="m"
                  colorClass="bg-red-500"
                  borderColorClass="border-red-200"
                  bgColorClass="bg-red-50/30"
                />

                <ActionSlider
                  label="Y-axis (left/right)"
                  description="Translation in meters"
                  value={action.y}
                  onChange={(y) => setAction({ ...action, y })}
                  min={-1}
                  max={1}
                  step={0.01}
                  unit="m"
                  colorClass="bg-green-500"
                  borderColorClass="border-green-200"
                  bgColorClass="bg-green-50/30"
                />

                <ActionSlider
                  label="Z-axis (up/down)"
                  description="Translation in meters"
                  value={action.z}
                  onChange={(z) => setAction({ ...action, z })}
                  min={-1}
                  max={1}
                  step={0.01}
                  unit="m"
                  colorClass="bg-blue-500"
                  borderColorClass="border-blue-200"
                  bgColorClass="bg-blue-50/30"
                />

                <ActionSlider
                  label="Roll (X-axis rotation)"
                  description="Rotation in degrees"
                  value={action.rx}
                  onChange={(rx) => setAction({ ...action, rx })}
                  min={-180}
                  max={180}
                  step={1}
                  unit="°"
                  colorClass="bg-red-300"
                  borderColorClass="border-red-100"
                  bgColorClass="bg-red-50/20"
                />

                <ActionSlider
                  label="Pitch (Y-axis rotation)"
                  description="Rotation in degrees"
                  value={action.ry}
                  onChange={(ry) => setAction({ ...action, ry })}
                  min={-180}
                  max={180}
                  step={1}
                  unit="°"
                  colorClass="bg-green-300"
                  borderColorClass="border-green-100"
                  bgColorClass="bg-green-50/20"
                />

                <ActionSlider
                  label="Yaw (Z-axis rotation)"
                  description="Rotation in degrees"
                  value={action.rz}
                  onChange={(rz) => setAction({ ...action, rz })}
                  min={-180}
                  max={180}
                  step={1}
                  unit="°"
                  colorClass="bg-blue-300"
                  borderColorClass="border-blue-100"
                  bgColorClass="bg-blue-50/20"
                />

                <ActionSlider
                  label="Gripper State"
                  description="-1 = closed, +1 = open"
                  value={action.gripper}
                  onChange={(gripper) => setAction({ ...action, gripper })}
                  min={-1}
                  max={1}
                  step={0.01}
                  unit=""
                  colorClass="bg-purple-500"
                  borderColorClass="border-purple-200"
                  bgColorClass="bg-purple-50/30"
                />
              </div>
            </div>

            <Button onClick={handleTokenize} className="w-full" size="lg">
              <ArrowRight className="h-4 w-4 mr-2" />
              Tokenize Action
            </Button>
          </div>

          {/* Output Section */}
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-4 block">Discrete Token Space</Label>
              
              {result ? (
                <div className="space-y-4">
                  <TokenDisplay tokens={result.tokens} dimensionColors={dimensionColors} />
                  <TokenBreakdown action={action} bins={result.bins} />
                  <PrecisionIndicator
                    originalValue={action.x}
                    reconstructedValue={getReconstructedValue(result.bins.x)}
                    isTerminated={action.terminate === 1}
                  />

                  <div className="text-xs text-muted-foreground bg-muted/20 rounded p-3">
                    <p className="font-medium mb-1">How it works:</p>
                    <p>Continuous values are discretized into 256 bins using linear mapping. Translation/gripper: [-1,1] → [0,255]. Rotation: [-180°,180°] → [0,255]. This allows language models to process robot actions as discrete tokens.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/20 rounded-lg p-8 border-2 border-dashed flex items-center justify-center min-h-[400px]">
                  <p className="text-sm text-muted-foreground text-center">
                    Adjust the sliders and click "Tokenize Action"<br />to see the conversion
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