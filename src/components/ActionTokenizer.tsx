import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { ArrowRight, Copy, RotateCcw } from "lucide-react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

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

const PRESETS = {
  pickObject: { terminate: 0, x: 0, y: 0, z: -0.3, rx: 0, ry: 0, rz: 0, gripper: -1.0 },
  placeObject: { terminate: 0, x: 0, y: 0, z: 0.3, rx: 0, ry: 0, rz: 0, gripper: 1.0 },
  moveForward: { terminate: 0, x: 0.5, y: 0, z: 0, rx: 0, ry: 0, rz: 0, gripper: 0 },
  rotate90: { terminate: 0, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 90, gripper: 0 },
  completeTask: { terminate: 1, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, gripper: 0 },
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

  const handlePreset = (preset: keyof typeof PRESETS) => {
    setAction(PRESETS[preset]);
    setResult(null);
  };

  const copyTokens = () => {
    if (result) {
      navigator.clipboard.writeText(result.tokens.join(" "));
      toast.success("Tokens copied to clipboard");
    }
  };

  const calculateError = (original: number, reconstructed: number) => {
    return Math.abs(original - reconstructed);
  };

  const getReconstructedValue = (bin: number, type: 'translation' | 'rotation' | 'gripper') => {
    if (type === 'translation' || type === 'gripper') {
      return Math.round(((bin / 127.5) - 1.0) * 1000) / 1000;
    } else {
      return Math.round(((bin * (360.0 / 255.0)) - 180) * 10) / 10;
    }
  };

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full"
    >
      <Card className="p-8 border-2">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Action Tokenization Visualizer</h2>
        
        {/* Preset Buttons */}
        <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
          <Label className="text-sm font-medium mb-3 block">Quick Presets</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePreset('pickObject')}>
              Pick Object
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePreset('placeObject')}>
              Place Object
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePreset('moveForward')}>
              Move Forward
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePreset('rotate90')}>
              Rotate 90°
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePreset('completeTask')}>
              Complete Task
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>

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

                {/* X Translation */}
                <div className="p-4 rounded-lg border-2 border-red-200 bg-red-50/30">
                  <div className="flex justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium">X-axis (forward/backward)</span>
                      <p className="text-xs text-muted-foreground">Translation in meters</p>
                    </div>
                    <span className="text-sm font-mono font-bold">{action.x.toFixed(3)} m</span>
                  </div>
                  <Slider
                    value={[action.x]}
                    onValueChange={(val) => setAction({ ...action, x: val[0] })}
                    min={-1}
                    max={1}
                    step={0.01}
                    className="[&_[role=slider]]:bg-red-500"
                  />
                </div>

                {/* Y Translation */}
                <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50/30">
                  <div className="flex justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium">Y-axis (left/right)</span>
                      <p className="text-xs text-muted-foreground">Translation in meters</p>
                    </div>
                    <span className="text-sm font-mono font-bold">{action.y.toFixed(3)} m</span>
                  </div>
                  <Slider
                    value={[action.y]}
                    onValueChange={(val) => setAction({ ...action, y: val[0] })}
                    min={-1}
                    max={1}
                    step={0.01}
                    className="[&_[role=slider]]:bg-green-500"
                  />
                </div>

                {/* Z Translation */}
                <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50/30">
                  <div className="flex justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium">Z-axis (up/down)</span>
                      <p className="text-xs text-muted-foreground">Translation in meters</p>
                    </div>
                    <span className="text-sm font-mono font-bold">{action.z.toFixed(3)} m</span>
                  </div>
                  <Slider
                    value={[action.z]}
                    onValueChange={(val) => setAction({ ...action, z: val[0] })}
                    min={-1}
                    max={1}
                    step={0.01}
                    className="[&_[role=slider]]:bg-blue-500"
                  />
                </div>

                {/* RX Rotation */}
                <div className="p-4 rounded-lg border-2 border-red-100 bg-red-50/20">
                  <div className="flex justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium">Roll (X-axis rotation)</span>
                      <p className="text-xs text-muted-foreground">Rotation in degrees</p>
                    </div>
                    <span className="text-sm font-mono font-bold">{action.rx.toFixed(1)}°</span>
                  </div>
                  <Slider
                    value={[action.rx]}
                    onValueChange={(val) => setAction({ ...action, rx: val[0] })}
                    min={-180}
                    max={180}
                    step={1}
                    className="[&_[role=slider]]:bg-red-300"
                  />
                </div>

                {/* RY Rotation */}
                <div className="p-4 rounded-lg border-2 border-green-100 bg-green-50/20">
                  <div className="flex justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium">Pitch (Y-axis rotation)</span>
                      <p className="text-xs text-muted-foreground">Rotation in degrees</p>
                    </div>
                    <span className="text-sm font-mono font-bold">{action.ry.toFixed(1)}°</span>
                  </div>
                  <Slider
                    value={[action.ry]}
                    onValueChange={(val) => setAction({ ...action, ry: val[0] })}
                    min={-180}
                    max={180}
                    step={1}
                    className="[&_[role=slider]]:bg-green-300"
                  />
                </div>

                {/* RZ Rotation */}
                <div className="p-4 rounded-lg border-2 border-blue-100 bg-blue-50/20">
                  <div className="flex justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium">Yaw (Z-axis rotation)</span>
                      <p className="text-xs text-muted-foreground">Rotation in degrees</p>
                    </div>
                    <span className="text-sm font-mono font-bold">{action.rz.toFixed(1)}°</span>
                  </div>
                  <Slider
                    value={[action.rz]}
                    onValueChange={(val) => setAction({ ...action, rz: val[0] })}
                    min={-180}
                    max={180}
                    step={1}
                    className="[&_[role=slider]]:bg-blue-300"
                  />
                </div>

                {/* Gripper */}
                <div className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50/30">
                  <div className="flex justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium">Gripper State</span>
                      <p className="text-xs text-muted-foreground">-1 = closed, +1 = open</p>
                    </div>
                    <span className="text-sm font-mono font-bold">{action.gripper.toFixed(3)}</span>
                  </div>
                  <Slider
                    value={[action.gripper]}
                    onValueChange={(val) => setAction({ ...action, gripper: val[0] })}
                    min={-1}
                    max={1}
                    step={0.01}
                    className="[&_[role=slider]]:bg-purple-500"
                  />
                </div>
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
                  {/* Token Display */}
                  <div className="bg-muted/30 rounded-lg p-6 border-2">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-medium text-muted-foreground">TOKENIZED ACTION SEQUENCE</p>
                      <Button variant="ghost" size="sm" onClick={copyTokens}>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {result.tokens.map((token, idx) => {
                        const colorKey = ['terminate', 'x', 'y', 'z', 'rx', 'ry', 'rz', 'gripper'][idx] as keyof typeof dimensionColors;
                        return (
                          <div
                            key={idx}
                            className={`${dimensionColors[colorKey]} text-white px-3 py-2 rounded font-mono font-bold text-lg`}
                          >
                            {token}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">
                      String: "{result.tokens.join(' ')}"
                    </p>
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="bg-muted/30 rounded-lg p-4 border">
                    <p className="text-xs font-medium text-muted-foreground mb-3">DETAILED BREAKDOWN</p>
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-4 gap-2 font-medium pb-2 border-b">
                        <span>Dimension</span>
                        <span>Value</span>
                        <span>Bin</span>
                        <span>Explanation</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        <span>Terminate</span>
                        <span className="font-mono">{action.terminate}</span>
                        <span className="font-mono font-bold">{result.bins.terminate}</span>
                        <span className="text-muted-foreground">{action.terminate ? 'Stop' : 'Continue'}</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        <span>X-axis</span>
                        <span className="font-mono">{action.x.toFixed(3)}m</span>
                        <span className="font-mono font-bold">{result.bins.x}</span>
                        <span className="text-muted-foreground">{action.x > 0 ? 'Forward' : action.x < 0 ? 'Backward' : 'None'}</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        <span>Y-axis</span>
                        <span className="font-mono">{action.y.toFixed(3)}m</span>
                        <span className="font-mono font-bold">{result.bins.y}</span>
                        <span className="text-muted-foreground">{action.y > 0 ? 'Right' : action.y < 0 ? 'Left' : 'None'}</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        <span>Z-axis</span>
                        <span className="font-mono">{action.z.toFixed(3)}m</span>
                        <span className="font-mono font-bold">{result.bins.z}</span>
                        <span className="text-muted-foreground">{action.z > 0 ? 'Up' : action.z < 0 ? 'Down' : 'None'}</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        <span>Roll (X)</span>
                        <span className="font-mono">{action.rx.toFixed(1)}°</span>
                        <span className="font-mono font-bold">{result.bins.rx}</span>
                        <span className="text-muted-foreground">Tilt</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        <span>Pitch (Y)</span>
                        <span className="font-mono">{action.ry.toFixed(1)}°</span>
                        <span className="font-mono font-bold">{result.bins.ry}</span>
                        <span className="text-muted-foreground">Nose</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        <span>Yaw (Z)</span>
                        <span className="font-mono">{action.rz.toFixed(1)}°</span>
                        <span className="font-mono font-bold">{result.bins.rz}</span>
                        <span className="text-muted-foreground">Rotate</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        <span>Gripper</span>
                        <span className="font-mono">{action.gripper.toFixed(3)}</span>
                        <span className="font-mono font-bold">{result.bins.gripper}</span>
                        <span className="text-muted-foreground">{action.gripper > 0 ? 'Open' : action.gripper < 0 ? 'Close' : 'Neutral'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Precision Loss */}
                  <div className="bg-muted/30 rounded-lg p-4 border">
                    <p className="text-xs font-medium text-muted-foreground mb-3">DISCRETIZATION PRECISION</p>
                    <div className="space-y-2 text-xs">
                      {action.terminate === 0 && (
                        <>
                          <div>
                            <span className="font-medium">Original X:</span> <span className="font-mono">{action.x.toFixed(6)} m</span>
                          </div>
                          <div>
                            <span className="font-medium">After tokenization:</span> <span className="font-mono">{getReconstructedValue(result.bins.x, 'translation').toFixed(6)} m</span>
                          </div>
                          <div>
                            <span className="font-medium">Error:</span> <span className="font-mono">{(calculateError(action.x, getReconstructedValue(result.bins.x, 'translation')) * 1000).toFixed(2)} mm</span>
                          </div>
                        </>
                      )}
                      <div className="pt-2 mt-2 border-t text-muted-foreground">
                        ℹ️ This is expected! RT-2 uses 256 bins per dimension for computational efficiency.
                      </div>
                    </div>
                  </div>

                  {/* How it works */}
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