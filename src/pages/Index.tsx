import { useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import UploadZone, { type UploadedFile } from "@/components/UploadZone";
import CloakingSettings, { type CloakSettings } from "@/components/CloakingSettings";
import CoverUpload, { type CoverImage } from "@/components/CoverUpload";
import ReencodingSettings, { type ReencodingConfig } from "@/components/ReencodingSettings";
import ProcessingView, { type ProcessingItem } from "@/components/ProcessingView";
import StatsBar from "@/components/StatsBar";
import { Shield } from "lucide-react";
import { processFile, loadFFmpeg } from "@/lib/ffmpeg-processor";
import { toast } from "sonner";

const defaultSettings: CloakSettings = {
  intensity: "medium",
  audio: { pitch: 12, speed: 8, volume: 7, stereo: 10 },
  video: { color: 10, brightness: 7, contrast: 8, noise: 5, metadata: true },
  variations: 3,
};

const defaultReencoding: ReencodingConfig = {
  enabled: true,
  outputFormat: "mp4",
  codec: "h264",
  resolution: "slight",
  resolutionOffset: 5,
  fpsMode: "slight",
  fpsOffset: 1,
  stripMetadata: true,
  randomizeFileSize: true,
};

const Index = () => {
  const [activeTab, setActiveTab] = useState("upload");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [settings, setSettings] = useState<CloakSettings>(defaultSettings);
  const [processing, setProcessing] = useState<ProcessingItem[]>([]);
  const [cover, setCover] = useState<CoverImage | null>(null);
  const [coverEnabled, setCoverEnabled] = useState(false);
  const [coverDuration, setCoverDuration] = useState(2);
  const [reencoding, setReencoding] = useState<ReencodingConfig>(defaultReencoding);
  const [isProcessing, setIsProcessing] = useState(false);

  const startProcessing = useCallback(async () => {
    if (files.length === 0 || isProcessing) return;
    setIsProcessing(true);

    const items: ProcessingItem[] = files.map((f) => ({
      id: f.id,
      name: f.name,
      status: "queued" as const,
      progress: 0,
      variations: settings.variations,
    }));
    setProcessing(items);
    setActiveTab("processing");

    try {
      await loadFFmpeg((progress, message) => {
        if (progress < 100) {
          setProcessing((prev) =>
            prev.map((item, i) =>
              i === 0 ? { ...item, status: "processing", progress: Math.round(progress * 0.1), message } : item
            )
          );
        }
      });
    } catch (err) {
      toast.error("Erro ao carregar FFmpeg. Tente novamente.");
      setIsProcessing(false);
      return;
    }

    const coverFile = coverEnabled && cover ? cover.file : undefined;

    for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
      const file = files[fileIdx];
      const results: Array<{ blob: Blob; filename: string }> = [];

      setProcessing((prev) =>
        prev.map((item, i) =>
          i === fileIdx ? { ...item, status: "processing", progress: 0, message: "Iniciando..." } : item
        )
      );

      try {
        for (let v = 0; v < settings.variations; v++) {
          const result = await processFile(
            file.file,
            settings,
            reencoding,
            v,
            (progress, message) => {
              const overallProgress = Math.round(((v + progress / 100) / settings.variations) * 100);
              setProcessing((prev) =>
                prev.map((item, i) =>
                  i === fileIdx
                    ? { ...item, progress: overallProgress, message: `Variação ${v + 1}/${settings.variations}: ${message}` }
                    : item
                )
              );
            },
            coverFile,
            coverDuration
          );
          results.push({ blob: result.blob, filename: result.filename });
        }

        setProcessing((prev) =>
          prev.map((item, i) =>
            i === fileIdx ? { ...item, status: "done", progress: 100, message: undefined, results } : item
          )
        );
        toast.success(`${file.name} — ${settings.variations} variações geradas!`);
      } catch (err) {
        console.error("Processing error:", err);
        setProcessing((prev) =>
          prev.map((item, i) =>
            i === fileIdx ? { ...item, status: "error", message: "Erro no processamento" } : item
          )
        );
        toast.error(`Erro ao processar ${file.name}`);
      }
    }

    setIsProcessing(false);
  }, [files, settings, reencoding, isProcessing, cover, coverEnabled, coverDuration]);

  const showSettingsPanel = activeTab === "upload" || activeTab === "processing";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground">CloakShield</h1>
            <span className="text-xs font-mono text-muted-foreground bg-surface px-2 py-0.5 rounded">v1.0</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sistema operacional
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <StatsBar />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className={showSettingsPanel ? "lg:col-span-3 space-y-4" : "lg:col-span-5 space-y-4"}>
              {activeTab === "upload" && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Upload de Criativos</h2>
                  </div>
                  <UploadZone files={files} onFilesChange={setFiles} onProcess={startProcessing} />
                </>
              )}
              {activeTab === "processing" && <ProcessingView items={processing} />}
              {activeTab === "projects" && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <p className="text-sm">Seus projetos aparecerão aqui</p>
                </div>
              )}
              {activeTab === "analytics" && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <p className="text-sm">Analytics em breve</p>
                </div>
              )}
              {activeTab === "settings" && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <p className="text-sm">Configurações gerais em breve</p>
                </div>
              )}
            </div>

            {showSettingsPanel && (
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-lg font-semibold text-foreground">Configurações</h2>
                </div>
                <CloakingSettings settings={settings} onChange={setSettings} />
                <CoverUpload
                  cover={cover}
                  onCoverChange={setCover}
                  enabled={coverEnabled}
                  onEnabledChange={setCoverEnabled}
                  duration={coverDuration}
                  onDurationChange={setCoverDuration}
                />
                <ReencodingSettings config={reencoding} onChange={setReencoding} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
