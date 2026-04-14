import { useState, useCallback } from "react";
import { ImageIcon, Upload, X, Eye, EyeOff, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export interface CoverImage {
  id: string;
  name: string;
  size: number;
  preview?: string;
  file: File;
}

interface CoverUploadProps {
  cover: CoverImage | null;
  onCoverChange: (cover: CoverImage | null) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  duration: number;
  onDurationChange: (duration: number) => void;
}

const CoverUpload = ({ cover, onCoverChange, enabled, onEnabledChange, duration, onDurationChange }: CoverUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        onCoverChange({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          preview: url,
          file,
        });
      }
    },
    [onCoverChange]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      onCoverChange({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        preview: url,
        file,
      });
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            Capa para Análise
          </CardTitle>
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Substitui os primeiros segundos do vídeo pela imagem de capa. Algoritmos analisam os primeiros frames.
        </p>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              A imagem será inserida como os primeiros {duration}s do vídeo. Use uma imagem neutra (paisagem, estilo de vida).
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-foreground">Duração da capa</Label>
              <Badge variant="outline" className="font-mono text-xs border-border text-muted-foreground">
                {duration}s
              </Badge>
            </div>
            <Slider
              value={[duration]}
              onValueChange={([v]) => onDurationChange(v)}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>

          {cover ? (
            <div className="relative rounded-xl overflow-hidden border border-border group">
              {cover.preview && (
                <img
                  src={cover.preview}
                  alt="Capa"
                  className="w-full h-40 object-cover"
                />
              )}
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onCoverChange(null)}
                  className="gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Remover
                </Button>
              </div>
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <Badge variant="secondary" className="text-xs bg-background/80 border-0">
                  <Eye className="w-3 h-3 mr-1" /> Algoritmos
                </Badge>
                <Badge variant="secondary" className="text-xs bg-background/80 border-0">
                  <EyeOff className="w-3 h-3 mr-1" /> Público
                </Badge>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Arraste uma imagem de capa</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, WEBP</p>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default CoverUpload;
