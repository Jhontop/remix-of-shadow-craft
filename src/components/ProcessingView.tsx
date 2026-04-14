import { CheckCircle2, Loader2, Clock, Download, Eye, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { downloadBlob } from "@/lib/ffmpeg-processor";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ProcessingItem {
  id: string;
  name: string;
  status: "queued" | "processing" | "done" | "error";
  progress: number;
  variations: number;
  message?: string;
  results?: Array<{ blob: Blob; filename: string }>;
}

interface ProcessingViewProps {
  items: ProcessingItem[];
}

const statusConfig = {
  queued: { icon: Clock, label: "Na fila", color: "text-muted-foreground" },
  processing: { icon: Loader2, label: "Processando", color: "text-primary" },
  done: { icon: CheckCircle2, label: "Concluído", color: "text-emerald-400" },
  error: { icon: Clock, label: "Erro", color: "text-destructive" },
};

const ProcessingView = ({ items }: ProcessingViewProps) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-8 h-8 mb-3 opacity-30" />
        <p className="text-sm">Nenhum processamento ativo</p>
        <p className="text-xs mt-1">Faça upload e processe seus criativos</p>
      </div>
    );
  }

  const completed = items.filter((i) => i.status === "done").length;
  const total = items.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Processamento</h3>
          <p className="text-sm text-muted-foreground">
            {completed}/{total} concluído{completed !== 1 ? "s" : ""}
          </p>
        </div>
        <Badge variant="outline" className="border-border text-muted-foreground font-mono">
          {Math.round((completed / total) * 100)}%
        </Badge>
      </div>

      <Progress value={(completed / total) * 100} className="h-1.5 bg-surface" />

      <div className="space-y-2">
        {items.map((item) => {
          const config = statusConfig[item.status];
          const Icon = config.icon;
          return (
            <Card key={item.id} className="bg-surface border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${config.color} ${
                      item.status === "processing" ? "animate-spin" : ""
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${config.color}`}>{config.label}</span>
                      {item.status === "processing" && (
                        <>
                          <span className="text-xs text-muted-foreground font-mono">{item.progress}%</span>
                          {item.message && <span className="text-xs text-muted-foreground">— {item.message}</span>}
                        </>
                      )}
                      {item.status === "error" && item.message && (
                        <span className="text-xs text-destructive">{item.message}</span>
                      )}
                    </div>
                    {item.status === "processing" && (
                      <Progress value={item.progress} className="h-1 mt-2 bg-card" />
                    )}
                  </div>
                  {item.status === "done" && item.results && (
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-xs bg-card border-0 text-secondary-foreground">
                        {item.results.length}x
                      </Badge>
                      {item.results.map((r, i) => (
                        <Button
                          key={i}
                          size="sm"
                          variant="ghost"
                          className="h-8 text-muted-foreground hover:text-foreground gap-1 text-xs"
                          onClick={() => downloadBlob(r.blob, r.filename)}
                        >
                          <Download className="w-3.5 h-3.5" /> V{i + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProcessingView;
