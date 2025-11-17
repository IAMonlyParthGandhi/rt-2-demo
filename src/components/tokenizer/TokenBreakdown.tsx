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

interface TokenBreakdownProps {
  action: ActionState;
  bins: ActionState;
}

export function TokenBreakdown({ action, bins }: TokenBreakdownProps) {
  const getExplanation = (dimension: string, value: number) => {
    switch (dimension) {
      case 'terminate':
        return value ? 'Stop' : 'Continue';
      case 'x':
        return value > 0 ? 'Forward' : value < 0 ? 'Backward' : 'None';
      case 'y':
        return value > 0 ? 'Right' : value < 0 ? 'Left' : 'None';
      case 'z':
        return value > 0 ? 'Up' : value < 0 ? 'Down' : 'None';
      case 'rx':
        return 'Tilt';
      case 'ry':
        return 'Nose';
      case 'rz':
        return 'Rotate';
      case 'gripper':
        return value > 0 ? 'Open' : value < 0 ? 'Close' : 'Neutral';
      default:
        return '';
    }
  };

  const dimensions = [
    { key: 'terminate', label: 'Terminate', unit: '' },
    { key: 'x', label: 'X-axis', unit: 'm' },
    { key: 'y', label: 'Y-axis', unit: 'm' },
    { key: 'z', label: 'Z-axis', unit: 'm' },
    { key: 'rx', label: 'Roll (X)', unit: '°' },
    { key: 'ry', label: 'Pitch (Y)', unit: '°' },
    { key: 'rz', label: 'Yaw (Z)', unit: '°' },
    { key: 'gripper', label: 'Gripper', unit: '' },
  ];

  return (
    <div className="bg-muted/30 rounded-lg p-4 border">
      <p className="text-xs font-medium text-muted-foreground mb-3">DETAILED BREAKDOWN</p>
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-4 gap-2 font-medium pb-2 border-b">
          <span>Dimension</span>
          <span>Value</span>
          <span>Bin</span>
          <span>Explanation</span>
        </div>
        
        {dimensions.map(({ key, label, unit }) => {
          const actionKey = key as keyof ActionState;
          const value = action[actionKey];
          const bin = bins[actionKey];
          const displayValue = key === 'terminate' 
            ? value.toString() 
            : key.startsWith('r') 
              ? value.toFixed(1) + unit 
              : value.toFixed(3) + unit;
          
          return (
            <div key={key} className="grid grid-cols-4 gap-2">
              <span>{label}</span>
              <span className="font-mono">{displayValue}</span>
              <span className="font-mono font-bold">{bin}</span>
              <span className="text-muted-foreground">{getExplanation(key, value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
