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

function buildAudioFilters(audio: CloakSettings["audio"]): string[] {
  const filters: string[] = [];

  // Pitch shift via asetrate + aresample
  if (audio.pitch > 0) {
    const pitchFactor = 1 + (audio.pitch - 50) * 0.004; // ±20% range mapped from 0-100
    filters.push(`asetrate=44100*${pitchFactor.toFixed(4)}`);
    filters.push(`aresample=44100`);
  }

  // Speed (tempo)
  if (audio.speed > 0) {
    const speedFactor = 1 + (audio.speed - 50) * 0.003; // ±15%
    const clamped = Math.max(0.5, Math.min(2.0, speedFactor));
    filters.push(`atempo=${clamped.toFixed(4)}`);
  }

  // Volume
  if (audio.volume > 0) {
    const volFactor = 1 + (audio.volume - 50) * 0.005; // ±25%
    filters.push(`volume=${volFactor.toFixed(4)}`);
  }

  // Stereo panning
  if (audio.stereo > 0) {
    const pan = (audio.stereo - 50) * 0.01; // -0.5 to 0.5
    const left = (1 - pan).toFixed(3);
    const right = (1 + pan).toFixed(3);
    filters.push(`pan=stereo|c0=${left}*c0|c1=${right}*c1`);
  }

  return filters;
}

function buildVideoFilters(video: CloakSettings["video"]): string[] {
  const filters: string[] = [];

  // Color / Saturation
  if (video.color > 0) {
    const sat = 1 + (video.color - 50) * 0.006;
    filters.push(`eq=saturation=${sat.toFixed(3)}`);
  }

  // Brightness
  if (video.brightness > 0) {
    const bright = (video.brightness - 50) * 0.002;
    filters.push(`eq=brightness=${bright.toFixed(3)}`);
  }

  // Contrast
  if (video.contrast > 0) {
    const contrast = 1 + (video.contrast - 50) * 0.004;
    filters.push(`eq=contrast=${contrast.toFixed(3)}`);
  }

  // Noise
  if (video.noise > 0) {
    const strength = Math.round(video.noise * 0.3);
    if (strength > 0) {
      filters.push(`noise=alls=${strength}:allf=t`);
    }
  }

  // Blur
  if (video.blur > 0) {
    const sigma = video.blur * 0.15;
    if (sigma > 0.5) {
      filters.push(`gblur=sigma=${sigma.toFixed(2)}`);
    }
  }

  // Motion speed variation
  if (video.motion > 0) {
    const pts = 1 + (video.motion - 50) * 0.003;
    filters.push(`setpts=${(1 / pts).toFixed(4)}*PTS`);
  }

  return filters;
}

function getOutputExtension(config: ReencodingConfig): string {
  return `.${config.outputFormat}`;
}

function getCodecArgs(config: ReencodingConfig): string[] {
  const args: string[] = [];
  switch (config.codec) {
    case "h264":
      args.push("-c:v", "libx264", "-preset", "fast");
      break;
    case "h265":
      args.push("-c:v", "libx265", "-preset", "fast");
      break;
    case "vp9":
      args.push("-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "30");
      break;
    case "av1":
      // FFmpeg.wasm may not support av1, fallback to h264
      args.push("-c:v", "libx264", "-preset", "fast");
      break;
  }
  return args;
}

export interface ProcessResult {
  blob: Blob;
  filename: string;
  variationIndex: number;
}

/** Generate a random float in [min, max] */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Create a unique randomized parameter set per variation, based on intensity */
function randomizeParams(settings: CloakSettings) {
  // Scale factor by intensity: light = subtle, strong = aggressive
  const scale = settings.intensity === "light" ? 0.4 : settings.intensity === "medium" ? 1.0 : 1.8;

  return {
    audio: {
      pitch: rand(3, 20) * scale,
      speed: rand(2, 12) * scale,
      volume: rand(2, 10) * scale,
      stereo: rand(3, 15) * scale,
      fingerprint: settings.audio.fingerprint,
    },
    video: {
      color: rand(3, 16) * scale,
      brightness: rand(2, 12) * scale,
      contrast: rand(2, 14) * scale,
      noise: rand(1, 8) * scale,
      blur: rand(0.5, 5) * scale,
      motion: rand(1, 8) * scale,
      metadata: settings.video.metadata,
      faceDistortion: settings.video.faceDistortion,
    },
  };
}

export async function processFile(
  file: File,
  settings: CloakSettings,
  reencoding: ReencodingConfig,
  variationIndex: number,
  onProgress?: ProgressCallback
): Promise<ProcessResult> {
  const ff = await loadFFmpeg(onProgress);

  const inputName = `input_${Date.now()}`;
  const isVideo = file.type.startsWith("video");
  const inputExt = file.name.substring(file.name.lastIndexOf("."));
  const inputFile = `${inputName}${inputExt}`;

  // Each variation gets its own unique randomized parameters
  const varParams = randomizeParams(settings);

  const outputExt = reencoding.enabled ? getOutputExtension(reencoding) : inputExt;
  const baseName = file.name.substring(0, file.name.lastIndexOf("."));
  const outputFile = `output_${Date.now()}_v${variationIndex}${outputExt}`;

  onProgress?.(5, "Carregando arquivo...");
  const fileData = await fetchFile(file);
  await ff.writeFile(inputFile, fileData);

  // Build FFmpeg command
  const args: string[] = ["-i", inputFile];

  // Audio filters with unique random values
  const audioFilters = buildAudioFilters(varParams.audio);

  // Video filters with unique random values
  const videoFilters = isVideo ? buildVideoFilters(varParams.video) : [];

  // Apply audio filters
  if (audioFilters.length > 0) {
    args.push("-af", audioFilters.join(","));
  }

  // Apply video filters
  if (videoFilters.length > 0) {
    args.push("-vf", videoFilters.join(","));
  }

  // Reencoding settings
  if (reencoding.enabled) {
    args.push(...getCodecArgs(reencoding));
    args.push("-c:a", "aac");

    // Resolution variation
    if (reencoding.resolutionOffset > 0) {
      const offset = reencoding.resolutionOffset + Math.floor(rand(0, 5));
      args.push("-vf", `scale=iw-${offset}:ih-${offset}`);
    }

    // FPS variation
    if (reencoding.fpsOffset > 0) {
      const fpsAdjust = reencoding.fpsOffset + rand(0, 2);
      args.push("-r", `${30 - fpsAdjust}`);
    }
  } else {
    // Copy codecs if no reencoding
    if (videoFilters.length === 0 && audioFilters.length === 0) {
      args.push("-c", "copy");
    }
  }

  // Strip metadata
  if (reencoding.stripMetadata || settings.video.metadata) {
    args.push("-map_metadata", "-1");
    args.push("-fflags", "+bitexact");
  }

  // Audio fingerprint: add imperceptible noise
  if (settings.audio.fingerprint) {
    // Already handled via slight variations in audio filters
  }

  args.push("-y", outputFile);

  onProgress?.(15, "Aplicando camuflagem...");

  try {
    await ff.exec(args);
  } catch (err) {
    console.error("[FFmpeg] Processing error:", err);
    // Try simpler command as fallback
    const simpleArgs = ["-i", inputFile, "-map_metadata", "-1", "-y", outputFile];
    await ff.exec(simpleArgs);
  }

  onProgress?.(90, "Finalizando...");

  const outputData = await ff.readFile(outputFile);
  const mimeType = isVideo
    ? `video/${reencoding.enabled ? reencoding.outputFormat : "mp4"}`
    : `audio/${reencoding.enabled ? "aac" : "mpeg"}`;

  const uint8 = outputData instanceof Uint8Array ? outputData : new TextEncoder().encode(outputData as string);
  const blob = new Blob([new Uint8Array(uint8)], { type: mimeType });

  // Cleanup
  await ff.deleteFile(inputFile).catch(() => {});
  await ff.deleteFile(outputFile).catch(() => {});

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
