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

  onProgress?.(0, "Carregando FFmpeg...");

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  loaded = true;
  onProgress?.(100, "FFmpeg carregado!");
  return ffmpeg;
}

/** Generate a random float in [min, max] */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function buildAudioFilters(settings: CloakSettings, scale: number): string[] {
  const filters: string[] = [];

  // Pitch shift via asetrate + aresample — small random variation
  const pitchShift = rand(0.97, 1.03) * (1 + (scale - 1) * 0.01);
  if (Math.abs(pitchShift - 1) > 0.001) {
    filters.push(`asetrate=44100*${pitchShift.toFixed(4)}`);
    filters.push(`aresample=44100`);
  }

  // Speed (tempo) — slight random variation
  const speedFactor = 1 + rand(-0.02, 0.02) * scale;
  const clampedSpeed = Math.max(0.5, Math.min(2.0, speedFactor));
  if (Math.abs(clampedSpeed - 1) > 0.001) {
    filters.push(`atempo=${clampedSpeed.toFixed(4)}`);
  }

  // Volume — slight random variation
  const volFactor = 1 + rand(-0.03, 0.03) * scale;
  if (Math.abs(volFactor - 1) > 0.001) {
    filters.push(`volume=${volFactor.toFixed(4)}`);
  }

  return filters;
}

function buildVideoFilters(settings: CloakSettings, scale: number, reencoding: ReencodingConfig): string[] {
  const filters: string[] = [];

  // Combine eq parameters into ONE filter call
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

  // Noise — very light
  const noiseStrength = Math.round(rand(1, 4) * scale);
  if (noiseStrength > 0 && settings.video.noise > 0) {
    filters.push(`noise=alls=${noiseStrength}:allf=t`);
  }

  // Resolution variation — MERGED here instead of separate -vf flag
  if (reencoding.enabled && reencoding.resolutionOffset > 0) {
    const offset = reencoding.resolutionOffset + Math.floor(rand(0, 5));
    // Use expressions so it works with any input size, ensure even dimensions
    filters.push(`scale=iw-${offset}:ih-${offset}`);
    filters.push(`pad=ceil(iw/2)*2:ceil(ih/2)*2`);
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
      args.push("-c:v", "libx265", "-preset", "fast", "-crf", "28");
      break;
    case "vp9":
      args.push("-c:v", "libvpx-vp9", "-b:v", "1M", "-crf", "30");
      break;
    case "av1":
      // FFmpeg.wasm doesn't support AV1, fallback to h264
      args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23");
      break;
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
  const inputFile = `input_${ts}${inputExt}`;

  const scale = settings.intensity === "light" ? 0.5 : settings.intensity === "medium" ? 1.0 : 1.8;

  const outputExt = reencoding.enabled ? `.${reencoding.outputFormat}` : inputExt;
  const baseName = file.name.substring(0, file.name.lastIndexOf("."));
  const outputFile = `output_${ts}_v${variationIndex}${outputExt}`;

  const useCover = isVideo && coverImage && coverDuration && coverDuration > 0;
  const coverFile = `cover_${ts}.png`;

  onProgress?.(5, "Carregando arquivo...");
  const fileData = await fetchFile(file);
  await ff.writeFile(inputFile, fileData);

  // Write cover image if provided
  if (useCover) {
    onProgress?.(8, "Carregando capa...");
    const coverData = await fetchFile(coverImage);
    await ff.writeFile(coverFile, coverData);
  }

  // Build FFmpeg command
  const args: string[] = [];

  if (useCover) {
    // Use cover image as first input, loop it for coverDuration seconds
    args.push("-loop", "1", "-t", `${coverDuration}`, "-i", coverFile);
    // Then the actual video
    args.push("-i", inputFile);
    // Use complex filter to concatenate cover + video
    const videoFilters = buildVideoFilters(settings, scale, reencoding);
    const eqFilter = videoFilters.length > 0 ? "," + videoFilters.join(",") : "";

    // Scale cover to match video, then concat
    args.push(
      "-filter_complex",
      `[0:v]scale=iw:ih,setsar=1[cover];[1:v]${videoFilters.length > 0 ? videoFilters.join(",") + "," : ""}setsar=1[main];[cover][main]concat=n=2:v=1:a=0[outv]`
    );
    args.push("-map", "[outv]");
    args.push("-map", "1:a?");

    // Audio filters on the main video's audio
    const audioFilters = buildAudioFilters(settings, scale);
    if (audioFilters.length > 0) {
      args.push("-af", audioFilters.join(","));
    }
  } else {
    args.push("-i", inputFile);

    // Audio filters
    const audioFilters = buildAudioFilters(settings, scale);
    if (audioFilters.length > 0) {
      args.push("-af", audioFilters.join(","));
    }

    // Video filters — ALL in one -vf flag (including resolution)
    if (isVideo) {
      const videoFilters = buildVideoFilters(settings, scale, reencoding);
      if (videoFilters.length > 0) {
        args.push("-vf", videoFilters.join(","));
      }
    }
  }

  // Codec / reencoding
  if (reencoding.enabled) {
    if (isVideo) {
      args.push(...getCodecArgs(reencoding));
    }
    args.push("-c:a", "aac", "-b:a", "128k");

    // FPS variation
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

  // Strip metadata
  if (reencoding.stripMetadata || settings.video.metadata) {
    args.push("-map_metadata", "-1");
    args.push("-fflags", "+bitexact");
  }

  // Movflags for proper MP4
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
    // Fallback: simple re-encode
    const fallbackArgs = ["-i", inputFile];
    if (isVideo) {
      fallbackArgs.push("-c:v", "libx264", "-preset", "fast", "-crf", "23");
    }
    fallbackArgs.push("-c:a", "aac", "-b:a", "128k", "-map_metadata", "-1", "-y", outputFile);
    await ff.exec(fallbackArgs);
  }

  onProgress?.(90, "Finalizando...");

  const outputData = await ff.readFile(outputFile);
  const mimeType = isVideo
    ? `video/${reencoding.enabled ? reencoding.outputFormat : "mp4"}`
    : `audio/${reencoding.enabled ? "aac" : "mpeg"}`;

  let uint8 = outputData instanceof Uint8Array ? outputData : new TextEncoder().encode(outputData as string);

  // Randomize file size: append random padding bytes to change the file hash
  if (reencoding.randomizeFileSize) {
    const paddingSize = Math.floor(rand(64, 512));
    const padding = new Uint8Array(paddingSize);
    crypto.getRandomValues(padding);
    const combined = new Uint8Array(uint8.length + paddingSize);
    combined.set(uint8);
    combined.set(padding, uint8.length);
    uint8 = combined;
  }

  const blob = new Blob([uint8.buffer as ArrayBuffer], { type: mimeType });

  // Cleanup
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
  URL.revokeObjectURL(url);
}
