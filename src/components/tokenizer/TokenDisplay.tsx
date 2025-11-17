import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface TokenDisplayProps {
  tokens: number[];
  dimensionColors: Record<string, string>;
}

export function TokenDisplay({ tokens, dimensionColors }: TokenDisplayProps) {
  const copyTokens = () => {
    navigator.clipboard.writeText(tokens.join(" "));
    toast.success("Tokens copied to clipboard");
  };

  const dimensions = ['terminate', 'x', 'y', 'z', 'rx', 'ry', 'rz', 'gripper'];

  return (
    <div className="bg-muted/30 rounded-lg p-6 border-2">
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-medium text-muted-foreground">TOKENIZED ACTION SEQUENCE</p>
        <Button variant="ghost" size="sm" onClick={copyTokens}>
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {tokens.map((token, idx) => {
          const colorKey = dimensions[idx] as keyof typeof dimensionColors;
          return (
            <div
              key={idx}
              className={`${dimensionColors[colorKey]} text-white px-3 py-2 rounded font-mono font-bold text-lg shadow-sm`}
            >
              {token}
            </div>
          );
        })}
      </div>
      <p className="text-xs font-mono text-muted-foreground">
        String: "{tokens.join(' ')}"
      </p>
    </div>
  );
}
