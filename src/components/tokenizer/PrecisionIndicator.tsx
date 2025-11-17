interface PrecisionIndicatorProps {
  originalValue: number;
  reconstructedValue: number;
  isTerminated: boolean;
}

export function PrecisionIndicator({ 
  originalValue, 
  reconstructedValue, 
  isTerminated 
}: PrecisionIndicatorProps) {
  const error = Math.abs(originalValue - reconstructedValue);

  return (
    <div className="bg-muted/30 rounded-lg p-4 border">
      <p className="text-xs font-medium text-muted-foreground mb-3">DISCRETIZATION PRECISION</p>
      <div className="space-y-2 text-xs">
        {!isTerminated && (
          <>
            <div>
              <span className="font-medium">Original X:</span>{" "}
              <span className="font-mono">{originalValue.toFixed(6)} m</span>
            </div>
            <div>
              <span className="font-medium">After tokenization:</span>{" "}
              <span className="font-mono">{reconstructedValue.toFixed(6)} m</span>
            </div>
            <div>
              <span className="font-medium">Error:</span>{" "}
              <span className="font-mono">{(error * 1000).toFixed(2)} mm</span>
            </div>
          </>
        )}
        <div className="pt-2 mt-2 border-t text-muted-foreground">
          ℹ️ This is expected! RT-2 uses 256 bins per dimension for computational efficiency.
        </div>
      </div>
    </div>
  );
}
