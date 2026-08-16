import type { Shape } from "../types";

/**
 * Shape creation factory functions
 */

/**
 * Create a triangle shape at default position
 */
export function createTriangle(existingShapesCount: number): Shape {
  return {
    id: `triangle-${existingShapesCount + 1}`,
    name: "",
    vertices: [
      { x: 60, y: 60 },
      { x: 84, y: 60 },
      { x: 72, y: 84 },
    ],
    color: "#dc2626",
    fillColor: "#ff6b6b",
  };
}
