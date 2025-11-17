import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface ActionSliderProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  colorClass: string;
  borderColorClass: string;
  bgColorClass: string;
}

export function ActionSlider({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  colorClass,
  borderColorClass,
  bgColorClass,
}: ActionSliderProps) {
  return (
    <div className={`p-4 rounded-lg border-2 ${borderColorClass} ${bgColorClass}`}>
      <div className="flex justify-between mb-2">
        <div>
          <span className="text-sm font-medium">{label}</span>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="text-sm font-mono font-bold">
          {value.toFixed(step >= 1 ? 1 : 3)} {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(val) => onChange(val[0])}
        min={min}
        max={max}
        step={step}
        className={`[&_[role=slider]]:${colorClass}`}
      />
    </div>
  );
}
