import { CheckCircle2, Loader2, Clock, Download, AlertCircle, Play } from "lucide-react";
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
  isProcessing?: boolean;
}

const statusConfig = {
  queued: { icon: Clock, label: "Na fila", color: "text-muted-foreground" },
  processing: { icon: Loader2, label: "Processando", color: "text-primary" },
  done: { icon: CheckCircle2, label: "Concluído", color: "text-emerald-400" },
  error: { icon: AlertCircle, label: "Erro", color: "text-destructive" },
};

const ProcessingView = ({ items, isProcessing }: ProcessingViewProps) => {
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
  const errored = items.filter((i) => i.status === "error").length;
  const total = items.length;

  const downloadAll = () => {
    items.forEach((item) => {
      if (item.status === "done" && item.results) {
        item.results.forEach((r) => downloadBlob(r.blob, r.filename));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Processamento</h3>
          <p className="text-sm text-muted-foreground">
            {completed}/{total} concluído{completed !== 1 ? "s" : ""}
            {errored > 0 && ` • ${errored} erro${errored !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isProcessing && (
            <Badge variant="outline" className="border-primary/30 text-primary animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processando
            </Badge>
          )}
          <Badge variant="outline" className="border-border text-muted-foreground font-mono">
            {total > 0 ? Math.round((completed / total) * 100) : 0}%
          </Badge>
          {completed > 0 && !isProcessing && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-border text-muted-foreground hover:text-foreground"
              onClick={downloadAll}
            >
              <Download className="w-3.5 h-3.5" /> Baixar Todos
            </Button>
          )}
        </div>
      </div>

      <Progress value={total > 0 ? (completed / total) * 100 : 0} className="h-1.5 bg-surface" />

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
                          <span className="text-xs text-muted-foreground font-mono">
                            {item.progress}%
                          </span>
                          {item.message && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              — {item.message}
                            </span>
                          )}
                        </>
                      )}
                      {item.status === "error" && item.message && (
                        <span className="text-xs text-destructive">{item.message}</span>
                      )}
                      {item.status === "done" && item.results && (
                        <span className="text-xs text-emerald-400">
                          {item.results.length} variação{item.results.length !== 1 ? "ões" : ""}{" "}
                          gerada{item.results.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {item.status === "processing" && (
                      <Progress value={item.progress} className="h-1 mt-2 bg-card" />
                    )}
                  </div>
                  {item.status === "done" && item.results && (
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-card border-0 text-secondary-foreground"
                      >
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