import { useState, useCallback } from "react";
import { Upload, Film, Music, X, FileVideo, FileAudio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: "video" | "audio";
  preview?: string;
  file: File;
}

interface UploadZoneProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  onProcess: () => void;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const UploadZone = ({ files, onFilesChange, onProcess }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      const newFiles: UploadedFile[] = droppedFiles.map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        size: f.size,
        type: f.type.startsWith("video") ? "video" : "audio",
        file: f,
      }));
      onFilesChange([...files, ...newFiles]);
    },
    [files, onFilesChange]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const newFiles: UploadedFile[] = selected.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type.startsWith("video") ? "video" : "audio",
      file: f,
    }));
    onFilesChange([...files, ...newFiles]);
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
          isDragging
            ? "border-primary bg-primary/5 glow-md"
            : "border-border hover:border-muted-foreground"
        }`}
      >
        <input
          type="file"
          multiple
          accept="video/*,audio/*"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center">
            <Upload className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">
              Arraste e solte seus criativos aqui
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              MP4, MOV, AVI, MKV (até 100MB) • MP3, WAV, AAC, FLAC (até 10MB)
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="gap-1.5 bg-surface text-secondary-foreground border-0">
              <Film className="w-3 h-3" /> Vídeo
            </Badge>
            <Badge variant="secondary" className="gap-1.5 bg-surface text-secondary-foreground border-0">
              <Music className="w-3 h-3" /> Áudio
            </Badge>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {files.length} arquivo{files.length > 1 ? "s" : ""} carregado{files.length > 1 ? "s" : ""}
            </span>
            <Button onClick={onProcess} size="sm" className="gradient-primary text-primary-foreground glow-sm hover:opacity-90">
              Processar Tudo
            </Button>
          </div>
          <div className="grid gap-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border group"
              >
                <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center shrink-0">
                  {file.type === "video" ? (
                    <FileVideo className="w-5 h-5 text-primary" />
                  ) : (
                    <FileAudio className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                  {file.type === "video" ? "Vídeo" : "Áudio"}
                </Badge>
                <button
                  onClick={() => removeFile(file.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
