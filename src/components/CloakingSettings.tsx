import { Volume2, Eye, Wand2, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface CloakSettings {
  intensity: "light" | "medium" | "strong";
  audio: {
    pitch: number;
    speed: number;
    volume: number;
    stereo: number;
    fingerprint: boolean;
  };
  video: {
    color: number;
    brightness: number;
    contrast: number;
    noise: number;
    blur: number;
    motion: number;
    metadata: boolean;
    faceDistortion: boolean;
  };
  variations: number;
}

interface CloakingSettingsProps {
  settings: CloakSettings;
  onChange: (settings: CloakSettings) => void;
}

const intensityColors = {
  light: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  strong: "bg-red-500/10 text-red-400 border-red-500/20",
};

const intensityPresets: Record<CloakSettings["intensity"], Omit<CloakSettings, "intensity" | "variations">> = {
  light: {
    audio: { pitch: 5, speed: 3, volume: 4, stereo: 5, fingerprint: true },
    video: { color: 4, brightness: 3, contrast: 4, noise: 2, blur: 1, motion: 2, metadata: true, faceDistortion: false },
  },
  medium: {
    audio: { pitch: 12, speed: 8, volume: 7, stereo: 10, fingerprint: true },
    video: { color: 10, brightness: 7, contrast: 8, noise: 5, blur: 3, motion: 5, metadata: true, faceDistortion: false },
  },
  strong: {
    audio: { pitch: 22, speed: 15, volume: 12, stereo: 18, fingerprint: true },
    video: { color: 18, brightness: 14, contrast: 16, noise: 10, blur: 6, motion: 10, metadata: true, faceDistortion: true },
  },
};

const CloakingSettings = ({ settings, onChange }: CloakingSettingsProps) => {
  const updateAudio = (key: keyof CloakSettings["audio"], value: number | boolean) => {
    onChange({ ...settings, audio: { ...settings.audio, [key]: value } });
  };

  const updateVideo = (key: keyof CloakSettings["video"], value: number | boolean) => {
    onChange({ ...settings, video: { ...settings.video, [key]: value } });
  };

  const applyPreset = (level: CloakSettings["intensity"]) => {
    const preset = intensityPresets[level];
    onChange({ ...settings, intensity: level, audio: { ...preset.audio }, video: { ...preset.video } });
  };

  return (
    <div className="space-y-4">
      {/* Intensity selector */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            Intensidade de Camuflagem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(["light", "medium", "strong"] as const).map((level) => (
              <button
                key={level}
                onClick={() => applyPreset(level)}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                  settings.intensity === level
                    ? intensityColors[level]
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                {level === "light" ? "Leve" : level === "medium" ? "Média" : "Forte"}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="audio" className="space-y-3">
        <TabsList className="w-full bg-surface border border-border">
          <TabsTrigger value="audio" className="flex-1 gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground">
            <Volume2 className="w-3.5 h-3.5" /> Áudio
          </TabsTrigger>
          <TabsTrigger value="video" className="flex-1 gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground">
            <Eye className="w-3.5 h-3.5" /> Vídeo
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex-1 gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground">
            <Wand2 className="w-3.5 h-3.5" /> Avançado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audio">
          <Card className="bg-card border-border">
            <CardContent className="pt-6 space-y-5">
              <SliderControl label="Pitch" value={settings.audio.pitch} onChange={(v) => updateAudio("pitch", v)} />
              <SliderControl label="Velocidade" value={settings.audio.speed} onChange={(v) => updateAudio("speed", v)} />
              <SliderControl label="Volume" value={settings.audio.volume} onChange={(v) => updateAudio("volume", v)} />
              <SliderControl label="Estéreo" value={settings.audio.stereo} onChange={(v) => updateAudio("stereo", v)} />
              <ToggleControl
                label="Fingerprint de Áudio"
                description="Gera hash único para evitar detecção"
                checked={settings.audio.fingerprint}
                onChange={(v) => updateAudio("fingerprint", v)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video">
          <Card className="bg-card border-border">
            <CardContent className="pt-6 space-y-5">
              <SliderControl label="Cor / Saturação" value={settings.video.color} onChange={(v) => updateVideo("color", v)} />
              <SliderControl label="Brilho" value={settings.video.brightness} onChange={(v) => updateVideo("brightness", v)} />
              <SliderControl label="Contraste" value={settings.video.contrast} onChange={(v) => updateVideo("contrast", v)} />
              <SliderControl label="Ruído Visual" value={settings.video.noise} onChange={(v) => updateVideo("noise", v)} />
              <SliderControl label="Desfoque" value={settings.video.blur} onChange={(v) => updateVideo("blur", v)} />
              <SliderControl label="Velocidade Movimento" value={settings.video.motion} onChange={(v) => updateVideo("motion", v)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card className="bg-card border-border">
            <CardContent className="pt-6 space-y-5">
              <ToggleControl
                label="Limpar Metadados"
                description="Remove EXIF, codec info, e dados identificáveis"
                checked={settings.video.metadata}
                onChange={(v) => updateVideo("metadata", v)}
              />
              <ToggleControl
                label="Distorção de Rostos"
                description="Aplica modificações sutis em rostos detectados"
                checked={settings.video.faceDistortion}
                onChange={(v) => updateVideo("faceDistortion", v)}
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-foreground">Variações</Label>
                  <Badge variant="outline" className="font-mono text-xs border-border text-muted-foreground">
                    {settings.variations}x
                  </Badge>
                </div>
                <Slider
                  value={[settings.variations]}
                  onValueChange={([v]) => onChange({ ...settings, variations: v })}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Gera {settings.variations} versão{settings.variations > 1 ? "ões" : ""} única{settings.variations > 1 ? "s" : ""} de cada criativo
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function SliderControl({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-foreground">{label}</Label>
        <span className="text-xs font-mono text-muted-foreground">{value}%</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={0} max={100} step={1} className="w-full" />
    </div>
  );
}

function ToggleControl({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label className="text-sm text-foreground">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default CloakingSettings;
