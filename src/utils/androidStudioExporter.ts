import { generateJavaCode } from "./codeExporter";
import type { Point, Line, SequenceItem, PathChain } from "../types";

const DEFAULT_PLUGIN_URL = "http://localhost:8356";
const PLUGIN_URL_STORAGE_KEY = "androidStudioPluginUrl";
const SKIP_GUIDE_STORAGE_KEY = "androidStudioSkipGuide";

export function getPluginUrl(): string {
  const saved = localStorage.getItem(PLUGIN_URL_STORAGE_KEY);
  return saved || DEFAULT_PLUGIN_URL;
}

export function shouldSkipGuide(): boolean {
  return localStorage.getItem(SKIP_GUIDE_STORAGE_KEY) === "1";
}

export function setSkipGuide(skip: boolean): void {
  if (skip) {
    localStorage.setItem(SKIP_GUIDE_STORAGE_KEY, "1");
  } else {
    localStorage.removeItem(SKIP_GUIDE_STORAGE_KEY);
  }
}

export async function checkPluginStatus(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${getPluginUrl()}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch (err) {
    return false;
  }
}

export interface AndroidStudioImportResult {
  success: boolean;
  message: string;
}

export async function exportToAndroidStudio(
  fileName: string,
  content: string,
): Promise<AndroidStudioImportResult> {
  const response = await fetch(`${getPluginUrl()}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName,
      content,
      package: "org.firstinspires.ftc.teamcode",
    }),
  });

  let result: { success?: boolean; message?: string; path?: string } | null = null;
  try {
    result = await response.json();
  } catch (err) {
    // ignore parse errors
  }

  if (response.ok) {
    return {
      success: true,
      message: result?.message || `파일이 Android Studio 프로젝트로 가져와졌습니다.`,
    };
  }

  return {
    success: false,
    message:
      result?.message ||
      `Android Studio 플러그인 요청 실패 (${response.status}): ${
        response.statusText || "알 수 없는 오류"
      }`,
  };
}

export async function generateAndUploadToAndroidStudio(
  startPoint: Point,
  lines: Line[],
  pathChains: PathChain[],
  sequence: SequenceItem[],
  classNameBase: string,
): Promise<AndroidStudioImportResult> {
  const isReady = await checkPluginStatus();
  if (!isReady) {
    return {
      success: false,
      message:
        "Android Studio 플러그인이 감지되지 않았습니다.\n\n" +
        `플러그인이 ${getPluginUrl()}에서 실행 중인지 확인해 주세요.\n` +
        "Android Studio에서 플러그인을 설치하고 실행하면 이 내보내기가 활성화됩니다.",
    };
  }

  try {
    const javaCode = await generateJavaCode(
      startPoint,
      lines,
      "full",
      pathChains,
      sequence,
      classNameBase,
    );
    return await exportToAndroidStudio(`${classNameBase}.java`, javaCode);
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        "Java 코드 생성 중 오류가 발생했습니다: " +
        (err instanceof Error ? err.message : String(err)),
    };
  }
}