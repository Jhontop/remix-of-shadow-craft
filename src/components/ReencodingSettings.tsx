import { RefreshCw, FileCode, Monitor, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export interface ReencodingConfig {
  enabled: boolean;
  outputFormat: "mp4" | "mov" | "mkv" | "webm";
  codec: "h264" | "h265" | "vp9" | "av1";
  resolution: "original" | "slight" | "custom";
  resolutionOffset: number;
  fpsMode: "original" | "slight" | "custom";
  fpsOffset: number;
  stripMetadata: boolean;
  randomizeFileSize: boolean;
}

interface ReencodingSettingsProps {
  config: ReencodingConfig;
  onChange: (config: ReencodingConfig) => void;
}

const ReencodingSettings = ({ config, onChange }: ReencodingSettingsProps) => {
  const update = <K extends keyof ReencodingConfig>(key: K, value: ReencodingConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Reencoding & Metadados
          </CardTitle>
          <Switch checked={config.enabled} onCheckedChange={(v) => update("enabled", v)} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Recompila o arquivo com codec e metadados únicos para evitar detecção de duplicidade.
        </p>
      </CardHeader>

      {config.enabled && (
        <CardContent className="space-y-5">
          {/* Output Format */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
              Formato de Saída
            </Label>
            <Select value={config.outputFormat} onValueChange={(v) => update("outputFormat", v as ReencodingConfig["outputFormat"])}>
              <SelectTrigger className="bg-surface border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4</SelectItem>
                <SelectItem value="mov">MOV</SelectItem>
                <SelectItem value="mkv">MKV</SelectItem>
                <SelectItem value="webm">WebM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Codec */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
              Codec
            </Label>
            <Select value={config.codec} onValueChange={(v) => update("codec", v as ReencodingConfig["codec"])}>
              <SelectTrigger className="bg-surface border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="h264">H.264 (compatível)</SelectItem>
                <SelectItem value="h265">H.265 / HEVC</SelectItem>
                <SelectItem value="vp9">VP9</SelectItem>
                <SelectItem value="av1">AV1</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resolution offset */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                Variação de Resolução
              </Label>
              <Badge variant="outline" className="font-mono text-xs border-border text-muted-foreground">
                ±{config.resolutionOffset}px
              </Badge>
            </div>
            <Slider
              value={[config.resolutionOffset]}
              onValueChange={([v]) => update("resolutionOffset", v)}
              min={0}
              max={20}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Ex: 1920×1080 → {1920 - config.resolutionOffset}×{1080 - config.resolutionOffset}
            </p>
          </div>

          {/* FPS offset */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Variação de FPS</Label>
              <Badge variant="outline" className="font-mono text-xs border-border text-muted-foreground">
                ±{config.fpsOffset} fps
              </Badge>
            </div>
            <Slider
              value={[config.fpsOffset]}
              onValueChange={([v]) => update("fpsOffset", v)}
              min={0}
              max={5}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Ex: 30fps → {30 - config.fpsOffset}fps
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm text-foreground">Limpar Metadados</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Remove EXIF, codec info, timestamps e dados identificáveis</p>
              </div>
              <Switch checked={config.stripMetadata} onCheckedChange={(v) => update("stripMetadata", v)} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm text-foreground">Randomizar Tamanho</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Adiciona padding aleatório para alterar o hash do arquivo</p>
              </div>
              <Switch checked={config.randomizeFileSize} onCheckedChange={(v) => update("randomizeFileSize", v)} />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ReencodingSettings;
