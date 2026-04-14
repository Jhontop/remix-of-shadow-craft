import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";
import type { CloakSettings } from "@/components/CloakingSettings";
import type { ReencodingConfig } from "@/components/ReencodingSettings";

let ffmpeg: FFmpeg | null = null;
let loaded = false;

export type ProgressCallback = (progress: number, message: string) => void;

export async function loadFFmpeg(onProgress?: ProgressCallback) {
  if (loaded && ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on("log", ({ message }) => {
    console.log("[FFmpeg]", message);
  });

  ffmpeg.on("progress", ({ progress }) => {
    onProgress?.(Math.round(progress * 100), "Processando...");
  });

  onProgress?.(0, "Baixando FFmpeg...");

  const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";

  try {
    onProgress?.(5, "Baixando ffmpeg-core.js...");
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript", true, (p) => {
      onProgress?.(5 + Math.round((p.received / (p.total || 1)) * 20), "Baixando ffmpeg-core.js...");
    });

    onProgress?.(30, "Baixando ffmpeg-core.wasm (~30MB)...");
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm", true, (p) => {
      const pct = p.total ? Math.round((p.received / p.total) * 60) : 0;
      onProgress?.(30 + pct, `Baixando WASM... ${Math.round(p.received / 1024 / 1024)}MB`);
    });

    onProgress?.(92, "Inicializando FFmpeg...");
    await ffmpeg.load({ coreURL, wasmURL });

    loaded = true;
    onProgress?.(100, "FFmpeg carregado!");
    return ffmpeg;
  } catch (err) {
    console.error("[FFmpeg] Load error:", err);
    ffmpeg = null;
    loaded = false;
    throw new Error(
      "Falha ao carregar FFmpeg. Verifique sua conexão e se o navegador suporta SharedArrayBuffer (Chrome/Firefox recomendado)."
    );
  }
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function buildAudioFilters(settings: CloakSettings, scale: number): string[] {
  const filters: string[] = [];

  const pitchShift = rand(0.97, 1.03) * (1 + (scale - 1) * 0.01);
  if (Math.abs(pitchShift - 1) > 0.001) {
    filters.push(`asetrate=44100*${pitchShift.toFixed(4)}`);
    filters.push(`aresample=44100`);
  }

  const speedFactor = 1 + rand(-0.02, 0.02) * scale;
  const clampedSpeed = Math.max(0.5, Math.min(2.0, speedFactor));
  if (Math.abs(clampedSpeed - 1) > 0.001) {
    filters.push(`atempo=${clampedSpeed.toFixed(4)}`);
  }

  const volFactor = 1 + rand(-0.03, 0.03) * scale;
  if (Math.abs(volFactor - 1) > 0.001) {
    filters.push(`volume=${volFactor.toFixed(4)}`);
  }

  return filters;
}

function buildVideoFilters(
  settings: CloakSettings,
  scale: number,
  reencoding: ReencodingConfig
): string[] {
  const filters: string[] = [];

  const sat = 1 + rand(-0.05, 0.05) * scale;
  const bright = rand(-0.02, 0.02) * scale;
  const contrast = 1 + rand(-0.03, 0.03) * scale;

  const eqParts: string[] = [];
  if (Math.abs(sat - 1) > 0.001) eqParts.push(`saturation=${sat.toFixed(3)}`);
  if (Math.abs(bright) > 0.001) eqParts.push(`brightness=${bright.toFixed(3)}`);
  if (Math.abs(contrast - 1) > 0.001) eqParts.push(`contrast=${contrast.toFixed(3)}`);
  if (eqParts.length > 0) {
    filters.push(`eq=${eqParts.join(":")}`);
  }

  const noiseStrength = Math.round(rand(1, 4) * scale);
  if (noiseStrength > 0 && settings.video.noise > 0) {
    filters.push(`noise=alls=${noiseStrength}:allf=t`);
  }

  // Use trunc to ensure even dimensions — required by h264
  if (reencoding.enabled && reencoding.resolutionOffset > 0) {
    const offset = reencoding.resolutionOffset + Math.floor(rand(0, 5));
    filters.push(`scale=trunc((iw-${offset})/2)*2:trunc((ih-${offset})/2)*2`);
  }

  return filters;
}

function getCodecArgs(config: ReencodingConfig): string[] {
  const args: string[] = [];
  switch (config.codec) {
    case "h264":
      args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23");
      break;
    case "h265":
      // FFmpeg.wasm lacks libx265 in most builds — fallback to h264
      args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23");
      break;
    case "vp9":
      args.push("-c:v", "libvpx-vp9", "-b:v", "1M", "-crf", "30");
      break;
    case "av1":
      // No AV1 encoder in FFmpeg.wasm — fallback to h264
      args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23");
      break;
    default:
      args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23");
  }
  return args;
}

export interface ProcessResult {
  blob: Blob;
  filename: string;
  variationIndex: number;
}

export async function processFile(
  file: File,
  settings: CloakSettings,
  reencoding: ReencodingConfig,
  variationIndex: number,
  onProgress?: ProgressCallback,
  coverImage?: File,
  coverDuration?: number
): Promise<ProcessResult> {
  const ff = await loadFFmpeg(onProgress);

  const ts = Date.now();
  const isVideo = file.type.startsWith("video");
  const inputExt = file.name.substring(file.name.lastIndexOf("."));
  // Include variationIndex in filename to avoid FS collisions between parallel calls
  const inputFile = `input_${ts}_${variationIndex}${inputExt}`;

  const scale =
    settings.intensity === "light" ? 0.5 : settings.intensity === "medium" ? 1.0 : 1.8;

  const outputExt = reencoding.enabled ? `.${reencoding.outputFormat}` : inputExt;
  const baseName = file.name.substring(0, file.name.lastIndexOf("."));
  const outputFile = `output_${ts}_v${variationIndex}${outputExt}`;

  const useCover = isVideo && !!coverImage && !!coverDuration && coverDuration > 0;
  const coverFile = `cover_${ts}_${variationIndex}.png`;

  onProgress?.(5, "Carregando arquivo...");
  const fileData = await fetchFile(file);
  await ff.writeFile(inputFile, fileData);

  if (useCover && coverImage) {
    onProgress?.(8, "Carregando capa...");
    const coverData = await fetchFile(coverImage);
    await ff.writeFile(coverFile, coverData);
  }

  const args: string[] = [];

  if (useCover) {
    // Input 0: cover image looped for coverDuration seconds
    args.push("-loop", "1", "-t", `${coverDuration}`, "-i", coverFile);
    // Input 1: main video
    args.push("-i", inputFile);

    const videoFilters = buildVideoFilters(settings, scale, reencoding);
    const vfChain = videoFilters.length > 0 ? videoFilters.join(",") + "," : "";

    // Scale cover to match video dimensions, force yuv420p, then concat
    args.push(
      "-filter_complex",
      `[0:v]scale=iw:ih,setsar=1,format=yuv420p[cover];` +
        `[1:v]${vfChain}setsar=1,format=yuv420p[main];` +
        `[cover][main]concat=n=2:v=1:a=0[outv]`
    );
    args.push("-map", "[outv]");
    args.push("-map", "1:a?");

    const audioFilters = buildAudioFilters(settings, scale);
    if (audioFilters.length > 0) {
      args.push("-af", audioFilters.join(","));
    }
  } else {
    args.push("-i", inputFile);

    const audioFilters = buildAudioFilters(settings, scale);
    if (audioFilters.length > 0) {
      args.push("-af", audioFilters.join(","));
    }

    if (isVideo) {
      const videoFilters = buildVideoFilters(settings, scale, reencoding);
      if (videoFilters.length > 0) {
        args.push("-vf", videoFilters.join(","));
      }
    }
  }

  if (reencoding.enabled) {
    if (isVideo) {
      args.push(...getCodecArgs(reencoding));
    }
    args.push("-c:a", "aac", "-b:a", "128k");

    if (reencoding.fpsOffset > 0) {
      const fpsAdjust = reencoding.fpsOffset + rand(0, 2);
      args.push("-r", `${Math.round(30 - fpsAdjust)}`);
    }
  } else if (!useCover) {
    const audioFilters = buildAudioFilters(settings, scale);
    if (audioFilters.length === 0 && (!isVideo || settings.video.noise === 0)) {
      args.push("-c", "copy");
    }
  }

  if (reencoding.stripMetadata || settings.video.metadata) {
    args.push("-map_metadata", "-1");
    args.push("-fflags", "+bitexact");
  }

  if (outputExt === ".mp4" || outputExt === ".mov") {
    args.push("-movflags", "+faststart");
  }

  args.push("-y", outputFile);

  onProgress?.(15, "Aplicando camuflagem...");
  console.log("[FFmpeg] args:", args.join(" "));

  try {
    await ff.exec(args);
  } catch (err) {
    console.error("[FFmpeg] Processing error:", err);
    // Fallback: minimal safe re-encode
    const fallbackArgs = ["-i", inputFile];
    if (isVideo) {
      fallbackArgs.push("-c:v", "libx264", "-preset", "fast", "-crf", "23");
    }
    fallbackArgs.push(
      "-c:a", "aac",
      "-b:a", "128k",
      "-map_metadata", "-1",
      "-movflags", "+faststart",
      "-y", outputFile
    );
    await ff.exec(fallbackArgs);
  }

  onProgress?.(90, "Finalizando...");

  const outputData = await ff.readFile(outputFile);
  const mimeType = isVideo
    ? `video/${reencoding.enabled ? reencoding.outputFormat : "mp4"}`
    : `audio/${reencoding.enabled ? "aac" : "mpeg"}`;

  const uint8 =
    outputData instanceof Uint8Array
      ? outputData
      : new TextEncoder().encode(outputData as string);

  // NOTE: Random byte padding was removed — it corrupts MP4/MOV containers.
  // Hash uniqueness is already guaranteed by the cloaking filters.

  const blob = new Blob([uint8.buffer as ArrayBuffer], { type: mimeType });

  // Free virtual FS memory
  await ff.deleteFile(inputFile).catch(() => {});
  await ff.deleteFile(outputFile).catch(() => {});
  if (useCover) await ff.deleteFile(coverFile).catch(() => {});

  const resultFilename = `${baseName}_cloaked_v${variationIndex + 1}${outputExt}`;

  onProgress?.(100, "Concluído!");

  return { blob, filename: resultFilename, variationIndex };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delay revoke to ensure download triggers before URL is freed
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}