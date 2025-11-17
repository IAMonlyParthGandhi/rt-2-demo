import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";

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

interface PresetButtonsProps {
  onPresetSelect: (preset: ActionState) => void;
  onReset: () => void;
}

const PRESETS: Record<string, { label: string; action: ActionState }> = {
  pickObject: {
    label: "Pick Object",
    action: { terminate: 0, x: 0, y: 0, z: -0.3, rx: 0, ry: 0, rz: 0, gripper: -1.0 },
  },
  placeObject: {
    label: "Place Object",
    action: { terminate: 0, x: 0, y: 0, z: 0.3, rx: 0, ry: 0, rz: 0, gripper: 1.0 },
  },
  moveForward: {
    label: "Move Forward",
    action: { terminate: 0, x: 0.5, y: 0, z: 0, rx: 0, ry: 0, rz: 0, gripper: 0 },
  },
  rotate90: {
    label: "Rotate 90°",
    action: { terminate: 0, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 90, gripper: 0 },
  },
  completeTask: {
    label: "Complete Task",
    action: { terminate: 1, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, gripper: 0 },
  },
};

export function PresetButtons({ onPresetSelect, onReset }: PresetButtonsProps) {
  return (
    <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
      <Label className="text-sm font-medium mb-3 block">Quick Presets</Label>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {Object.entries(PRESETS).map(([key, { label, action }]) => (
          <Button
            key={key}
            variant="outline"
            size="sm"
            onClick={() => onPresetSelect(action)}
          >
            {label}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>
    </div>
  );
}
