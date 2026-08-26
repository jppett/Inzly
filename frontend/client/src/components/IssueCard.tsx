import { AlertTriangle, Info, CheckCircle, ChevronDown, ChevronUp, Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Severity = "critical" | "warning" | "info" | "good";

interface IssueProps {
  title: string;
  description: string;
  severity: Severity;
  category: string;
  costEstimate?: string;
  hasPhotos?: boolean;
  onViewPhotos?: () => void;
}

export default function IssueCard({ title, description, severity, category, costEstimate, hasPhotos, onViewPhotos }: IssueProps) {
  const [expanded, setExpanded] = useState(false);

  const getIcon = () => {
    switch (severity) {
      case "critical": return <AlertTriangle className="h-5 w-5 text-destructive" strokeWidth={1.5} />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-[hsl(var(--clay))]" strokeWidth={1.5} />;
      case "good": return <CheckCircle className="h-5 w-5 text-secondary" strokeWidth={1.5} />;
      default: return <Info className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />;
    }
  };

  const getBorderColor = () => {
    switch (severity) {
      case "critical": return "border-l-destructive";
      case "warning": return "border-l-[hsl(var(--clay))]";
      case "good": return "border-l-secondary";
      default: return "border-l-muted-foreground";
    }
  };

  return (
    <Card 
      className={cn(
        "mb-3 overflow-hidden border-l-4 transition-all hover:shadow-sm cursor-pointer border-border/50", 
        getBorderColor()
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4 flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm truncate">{title}</h4>
            <div className="flex items-center gap-1 flex-shrink-0">
              {hasPhotos && onViewPhotos && (
                <button
                  onClick={(e) => { e.stopPropagation(); onViewPhotos(); }}
                  className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
                  data-testid="button-view-in-photo"
                  title="View in photo"
                >
                  <Camera className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              )}
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} /> : <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />}
            </div>
          </div>
          
          {!expanded && (
             <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{description}</p>
          )}

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {description}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/50">
                  <Badge variant="secondary" className="text-xs font-normal">
                    {category}
                  </Badge>
                  {costEstimate && (
                    <Badge variant="outline" className="text-xs">
                      Est. cost: {costEstimate}
                    </Badge>
                  )}
                  {hasPhotos && onViewPhotos && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onViewPhotos(); }}
                      className={cn(
                        "ml-auto flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors",
                        severity === "critical" ? "text-destructive hover:bg-destructive/10" : "text-[hsl(var(--clay))] hover:bg-[hsl(var(--clay))]/10"
                      )}
                      data-testid="button-view-in-photo-expanded"
                    >
                      <Camera className="h-3 w-3" strokeWidth={1.5} /> View in photo
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
}
