/**
 * Geometry utility functions for the visualizer
 */
import type { BasePoint } from "../types";

/**
 * Calculate the four corner points of a robot at a given position and heading
 * Assumes the robot is a rectangle centered at (x, y) with the given heading angle
 * The heading convention: 0° = right, 90° = down, 180° = left, 270° = up
 * (this matches SVG/screen coordinates where Y increases downward)
 * @param x - Robot center X position (in inches)
 * @param y - Robot center Y position (in inches)
 * @param heading - Robot heading in degrees
 * @param width - Robot width in inches (extends left-right from center)
 * @param height - Robot height in inches (extends forward-backward from center)
 * @returns Array of 4 corner points in order: [front-left, front-right, back-right, back-left]
 */
export function getRobotCorners(
  x: number,
  y: number,
  heading: number,
  width: number,
  height: number,
): BasePoint[] {
  // Convert heading from degrees to radians
  const headingRad = (heading * Math.PI) / 180;

  // Half dimensions
  const hw = width / 2;
  const hh = height / 2;

  // Calculate rotation components
  const cos = Math.cos(headingRad);
  const sin = Math.sin(headingRad);

  // Corner offsets relative to center (before rotation)
  // Define corners in local robot frame:
  // - width extends perpendicular to heading direction (left/right)
  // - height extends along heading direction (forward/backward)
  const corners = [
    { dx: -hw, dy: -hh }, // front-left (forward, left)
    { dx: hw, dy: -hh }, // front-right (forward, right)
    { dx: hw, dy: hh }, // back-right (backward, right)
    { dx: -hw, dy: hh }, // back-left (backward, left)
  ];

  // Rotate and translate corners
  // Using standard 2D rotation matrix for screen coordinates
  return corners.map((corner) => ({
    x: x + corner.dx * cos - corner.dy * sin,
    y: y + corner.dx * sin + corner.dy * cos,
  }));
}
