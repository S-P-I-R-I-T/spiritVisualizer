import type { Point, Line, Shape, SequenceItem, PathChain } from "../types";

/**
 * File save/load utilities for the visualizer
 */

export interface SaveData {
  startPoint: Point;
  lines: Line[];
  shapes?: Shape[];
  settings?: any;
  sequence?: SequenceItem[];
  pathChains?: PathChain[];
}

/**
 * Download trajectory data as a .pp file
 */
export function downloadTrajectory(
  startPoint: Point,
  lines: Line[],
  shapes: Shape[],
  sequence?: SequenceItem[],
  pathChains?: PathChain[],
): void {
  const jsonString = JSON.stringify({ startPoint, lines, shapes, sequence, pathChains });
  const blob = new Blob([jsonString], { type: "application/json" });
  const linkObj = document.createElement("a");
  const url = URL.createObjectURL(blob);

  linkObj.href = url;
  linkObj.download = "trajectory.pp";

  document.body.appendChild(linkObj);
  linkObj.click();
  document.body.removeChild(linkObj);
  URL.revokeObjectURL(url);
}

/**
 * Load trajectory from a file input event
 */
export function loadTrajectoryFromFile(
  evt: Event,
  onSuccess: (data: SaveData) => void,
  onError?: (error: Error) => void,
): void {
  const elem = evt.target as HTMLInputElement;
  const file = elem.files?.[0];

  if (!file) return;

  // Check file extension
  if (!file.name.toLowerCase().endsWith(".pp")) {
    const error = new Error(".pp 파일을 선택해 주세요");
    if (onError) onError(error);
    alert(error.message);
    return;
  }

  if (file) {
    const reader = new FileReader();

    reader.onload = function (e: ProgressEvent<FileReader>) {
      try {
        const result = e.target?.result as string;
        const jsonObj = JSON.parse(result) as SaveData;
        onSuccess(jsonObj);
      } catch (err) {
        console.error(err);
        if (onError) onError(err as Error);
      }
    };

    reader.readAsText(file);
  }
}

/**
 * Update the robot image displayed on the canvas
 */
export function updateRobotImageDisplay(): void {
  const robotImage = document.querySelector(
    'img[alt="Robot"]',
  ) as HTMLImageElement;
  const storedImage = localStorage.getItem("robot.png");
  if (robotImage && storedImage) {
    robotImage.src = storedImage;
  }
}
