import type { Point, Line, Shape, SequenceItem, PathChain, Settings } from "../types";

export interface ShareableState {
  version: 1;
  startPoint: Point;
  lines: Line[];
  shapes?: Shape[];
  sequence?: SequenceItem[];
  pathChains?: PathChain[];
  settings?: Partial<Settings>;
}

const HASH_PREFIX = "#data=";
const COMPRESSED_MARKER = "z";
const PLAIN_MARKER = "j";

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(b64: string): Uint8Array {
  let s = b64.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const binary = atob(s);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function compress(json: string): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const stream = new Blob([json])
      .stream()
      .pipeThrough(new CompressionStream("deflate"));
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch (err) {
    console.warn("Compression failed, falling back to raw encoding:", err);
    return null;
  }
}

async function decompress(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  const buf = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buf);
}

export async function buildShareUrl(
  startPoint: Point,
  lines: Line[],
  shapes: Shape[],
  sequence: SequenceItem[],
  pathChains: PathChain[],
  settings: Settings,
): Promise<string> {
  const settingsForUrl: Partial<Settings> = { ...settings };
  delete (settingsForUrl as any).customFieldImage;
  delete (settingsForUrl as any).robotImage;

  const payload: ShareableState = {
    version: 1,
    startPoint,
    lines,
    shapes,
    sequence,
    pathChains,
    settings: settingsForUrl,
  };

  const json = JSON.stringify(payload);
  const compressed = await compress(json);
  const encoded = compressed
    ? COMPRESSED_MARKER + bytesToBase64Url(compressed)
    : PLAIN_MARKER + bytesToBase64Url(new TextEncoder().encode(json));

  const base = window.location.origin + window.location.pathname;
  return `${base}${HASH_PREFIX}${encoded}`;
}

export async function parseShareHash(hash: string): Promise<ShareableState | null> {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const encoded = hash.slice(HASH_PREFIX.length);
  try {
    let json: string;
    const marker = encoded[0];
    const body = encoded.slice(1);
    if (marker === COMPRESSED_MARKER) {
      const bytes = base64UrlToBytes(body);
      json = await decompress(bytes);
    } else if (marker === PLAIN_MARKER) {
      const bytes = base64UrlToBytes(body);
      json = new TextDecoder().decode(bytes);
    } else {
      return null;
    }

    const obj = JSON.parse(json);
    if (!obj || typeof obj !== "object" || !obj.startPoint || !Array.isArray(obj.lines)) {
      return null;
    }
    return obj as ShareableState;
  } catch (err) {
    console.warn("Failed to parse share URL:", err);
    return null;
  }
}