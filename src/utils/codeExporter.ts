import prettier from "prettier";
import type {
  Point,
  Line,
  BasePoint,
  PathChain,
  SequenceItem,
} from "../types";
import { getCurvePoint, getLineStartHeading, getLineEndHeading } from "./math";

// Lazy-load Prettier's Java plugin; fall back gracefully if unavailable
let cachedJavaPlugin: any | null = null;
async function loadJavaPlugin() {
  if (cachedJavaPlugin !== null) return cachedJavaPlugin;
  const candidates = ["prettier/plugins/java.js", "prettier/plugins/java"];
  for (const path of candidates) {
    try {
      const mod = await import(path);
      cachedJavaPlugin = (mod as any).default ?? mod;
      return cachedJavaPlugin;
    } catch (err) {
      // ignore and try next
    }
  }
  cachedJavaPlugin = null;
  return null;
}

/**
 * Generate Java code from path data
 */
function sanitizeIdentifier(input: string | undefined, fallback: string): string {
  const cleaned = (input || "").replace(/[^a-zA-Z0-9]/g, "");
  if (!cleaned) return fallback;
  if (/^[0-9]/.test(cleaned)) return `${fallback}${cleaned}`;
  return cleaned;
}

function buildPathSegmentCode(line: Line, startExpression: string): string {
  const headingTypeToFunctionName = {
    constant: "setConstantHeadingInterpolation",
    linear: "setLinearHeadingInterpolation",
    tangential: "setTangentHeadingInterpolation",
  };

  const controlPoints = line.controlPoints
    .map((point) => `new Pose(${point.x.toFixed(3)}, ${point.y.toFixed(3)})`)
    .join(",\n            ");

  const curveType = line.controlPoints.length === 0 ? "BezierLine" : "BezierCurve";

  const allPoints = controlPoints
    ? `${startExpression},\n            ${controlPoints},\n            new Pose(${line.endPoint.x.toFixed(3)}, ${line.endPoint.y.toFixed(3)})`
    : `${startExpression},\n            new Pose(${line.endPoint.x.toFixed(3)}, ${line.endPoint.y.toFixed(3)})`;

  const headingConfig =
    line.endPoint.heading === "constant"
      ? `Math.toRadians(${line.endPoint.degrees ?? 0})`
      : line.endPoint.heading === "linear"
        ? `Math.toRadians(${line.endPoint.startDeg ?? 0}), Math.toRadians(${line.endPoint.endDeg ?? 0})`
        : "";

  const reverseConfig = line.endPoint.reverse ? "\n          .setReversed()" : "";

  return `.addPath(
            new ${curveType}(
              ${allPoints}
            )
          )
          .${headingTypeToFunctionName[line.endPoint.heading]}(${headingConfig})${reverseConfig}`;
}

/**
 * Format a number for Java output: trim trailing zeros while keeping
 * up to 3 decimal places (e.g. 144 -> "144", 15.5 -> "15.5").
 */
function fmtNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Convert a camelCase identifier into SCREAMING_SNAKE_CASE for enum names.
 */
function toScreamingSnake(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toUpperCase();
}

type FullStep =
  | {
      kind: "path";
      line: Line;
      startName: string;
      endName: string;
      chainName: string;
      stateName: string;
      endHeading: number;
    }
  | {
      kind: "action";
      name: string;
      code: string;
      durationSeconds: number;
      stateName: string;
    }
  | { kind: "wait"; name: string; durationSeconds: number; stateName: string };

/**
 * Generate a complete, runnable autonomous OpMode (state machine style).
 *
 * Each step in the sequence becomes a PathState:
 *   - path   -> DRIVE_<start>_<end> state that calls follower.followPath()
 *               and advances once the follower is no longer busy,
 *   - action -> ACTION_<name> state that runs the user-supplied code once and
 *               advances after the configured duration,
 *   - wait   -> WAIT_<name> state that advances after pathTimer reaches
 *               the configured duration.
 *
 * The generated code drives the robot through the sequence in order and
 * then stops, without any manual wiring.
 */
function generateFullAutonomous(
  startPoint: Point,
  lines: Line[],
  sequence: SequenceItem[],
  className: string,
): string {
  const safeClassName =
    sanitizeIdentifier(className, "PedroAutonomous") || "PedroAutonomous";

  const lineById = new Map<string, Line>();
  lines.forEach((line, idx) => {
    const id = line.id || `line-${idx + 1}`;
    lineById.set(id, line);
  });

  // Default sequence: every line in order.
  const seq: SequenceItem[] =
    sequence && sequence.length
      ? sequence
      : lines.map((line, idx) => ({
          kind: "path",
          lineId: line.id || `line-${idx + 1}`,
        }));

  const usedNames = new Set<string>(["startPose"]);
  const makeUniqueName = (base: string): string => {
    let name = base;
    let suffix = 1;
    while (usedNames.has(name)) {
      name = `${base}${++suffix}`;
    }
    usedNames.add(name);
    return name;
  };

  const steps: FullStep[] = [];
  let currentPoint: Point = startPoint;
  let currentPoseName = "startPose";

  seq.forEach((item, idx) => {
    if (item.kind === "path") {
      const line = lineById.get(item.lineId);
      if (!line || !line.endPoint) return;
      const endName = makeUniqueName(
        sanitizeIdentifier(line.name, `point${idx + 1}`),
      );
      const chainName = `drive${capitalize(currentPoseName)}To${capitalize(endName)}`;
      const stateName = `DRIVE_${toScreamingSnake(currentPoseName)}_${toScreamingSnake(endName)}`;
      const endHeading = getLineEndHeading(line, currentPoint);
      steps.push({
        kind: "path",
        line,
        startName: currentPoseName,
        endName,
        chainName,
        stateName,
        endHeading,
      });
      currentPoint = line.endPoint;
      currentPoseName = endName;
    } else if (item.kind === "action") {
      const baseName = sanitizeIdentifier(item.name, `action${idx + 1}`);
      const stateName = makeUniqueName(`ACTION_${baseName}`);
      steps.push({
        kind: "action",
        name: item.name || baseName,
        code: item.code || "",
        durationSeconds: (Number(item.durationMs) || 0) / 1000,
        stateName,
      });
    } else if (item.kind === "wait") {
      const baseName = sanitizeIdentifier(item.name, `wait${idx + 1}`);
      const stateName = makeUniqueName(`WAIT_${baseName}`);
      steps.push({
        kind: "wait",
        name: item.name || baseName,
        durationSeconds: (Number(item.durationMs) || 0) / 1000,
        stateName,
      });
    }
  });

  const firstPathStep = steps.find(
    (s): s is Extract<FullStep, { kind: "path" }> => s.kind === "path",
  );
  const startHeading = firstPathStep
    ? getLineStartHeading(firstPathStep.line, startPoint)
    : startPoint.heading === "linear"
      ? startPoint.startDeg
      : startPoint.heading === "constant"
        ? startPoint.degrees
        : 0;

  // Pose declarations (start point + each path end point)
  const startPoseDecl = `private final Pose startPose = new Pose(${fmtNumber(startPoint.x)}, ${fmtNumber(startPoint.y)}, Math.toRadians(${fmtNumber(startHeading)}));`;

  const pathSteps = steps.filter(
    (s): s is Extract<FullStep, { kind: "path" }> => s.kind === "path",
  );

  const endPoseDecls = pathSteps.map(
    (s) =>
      `private final Pose ${s.endName} = new Pose(${fmtNumber(s.line.endPoint.x)}, ${fmtNumber(s.line.endPoint.y)}, Math.toRadians(${fmtNumber(s.endHeading)}));`,
  );

  // PathChain field declarations
  const chainDecls = pathSteps.map((s) => `private PathChain ${s.chainName};`);

  // buildPaths() body
  const buildPathsBody = pathSteps.map((s) => {
    const { line, startName, endName, chainName } = s;
    const curveType =
      line.controlPoints.length === 0 ? "BezierLine" : "BezierCurve";

    const controlPointsStr = line.controlPoints
      .map((p) => `new Pose(${fmtNumber(p.x)}, ${fmtNumber(p.y)})`)
      .join(", ");

    const addPathArgs =
      line.controlPoints.length === 0
        ? `${startName}, ${endName}`
        : `${startName}, ${controlPointsStr}, ${endName}`;

    let headingConfig: string;
    if (line.endPoint.heading === "constant") {
      headingConfig = `.setConstantHeadingInterpolation(Math.toRadians(${fmtNumber(line.endPoint.degrees ?? 0)}))`;
    } else if (line.endPoint.heading === "linear") {
      headingConfig = `.setLinearHeadingInterpolation(Math.toRadians(${fmtNumber(line.endPoint.startDeg ?? 0)}), Math.toRadians(${fmtNumber(line.endPoint.endDeg ?? 0)}))`;
    } else {
      headingConfig = `.setTangentHeadingInterpolation()`;
    }

    const reverseConfig = line.endPoint.reverse ? "\n                .setReversed()" : "";

    return `${chainName} = follower.pathBuilder()
                .addPath(new ${curveType}(${addPathArgs}))
                ${headingConfig}${reverseConfig}
                .build();`;
  });

  // State machine cases (in sequence order)
  const stateCases = steps.map((s, idx) => {
    const nextState =
      idx < steps.length - 1 ? steps[idx + 1].stateName : "FINISHED";

    if (s.kind === "path") {
      const lineActions = (s.line.actions || []).filter(
        (a) => a && typeof a.code === "string" && a.code.trim(),
      );

      let actionBlock = "";
      if (lineActions.length > 0) {
        const actionCode = lineActions
          .map((a) =>
            a.code
              .split("\n")
              .map((line) => "                    " + line)
              .join("\n"),
          )
          .join("\n");
        actionBlock = `\n                if (pathStarted && follower.isBusy()) {\n${actionCode}\n                }`;
      }

      return `case ${s.stateName}:
                if (!follower.isBusy() && !pathStarted) {
                    follower.followPath(${s.chainName}, true);
                    pathStarted = true;
                }${actionBlock}
                if (pathStarted && !follower.isBusy()) {
                    setPathState(PathState.${nextState});
                }
                break;`;
    }

    if (s.kind === "action") {
      const codeLines = (s.code || "")
        .split("\n")
        .map((line) => "                    " + line)
        .join("\n");
      return `case ${s.stateName}:
                if (!pathStarted) {
${codeLines}
                    pathStarted = true;
                }
                if (pathTimer.getElapsedTimeSeconds() >= ${fmtNumber(s.durationSeconds)}) {
                    setPathState(PathState.${nextState});
                }
                break;`;
    }

    return `case ${s.stateName}:
                if (pathTimer.getElapsedTimeSeconds() >= ${fmtNumber(s.durationSeconds)}) {
                    setPathState(PathState.${nextState});
                }
                break;`;
  });

  const enumEntries = [...steps.map((s) => s.stateName), "FINISHED"].join(
    ",\n        ",
  );
  const firstState = steps.length > 0 ? steps[0].stateName : "FINISHED";

  return `package org.firstinspires.ftc.teamcode;

import com.pedropathing.follower.Follower;
import com.pedropathing.geometry.BezierCurve;
import com.pedropathing.geometry.BezierLine;
import com.pedropathing.geometry.Pose;
import com.pedropathing.paths.PathChain;
import com.pedropathing.util.Timer;
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.bylazar.telemetry.TelemetryManager;
import com.bylazar.telemetry.PanelsTelemetry;

import org.firstinspires.ftc.teamcode.pedroPathing.Constants;

@Autonomous(name = "${safeClassName}", group = "Autonomous")
public class ${safeClassName} extends OpMode {
    TelemetryManager panelsTelemetry;
    Follower follower;
    Timer pathTimer;

    public enum PathState {
        ${enumEntries}
    }

    PathState pathState;
    boolean pathStarted = false;

    ${startPoseDecl}
    ${endPoseDecls.join("\n    ")}

    ${chainDecls.join("\n    ")}

    public void buildPaths() {
        ${buildPathsBody.join("\n\n        ")}
    }

    public void statePathUpdate() {
        switch (pathState) {
            ${stateCases.join("\n\n            ")}

            case FINISHED:
                // Path complete
                break;

            default:
                panelsTelemetry.debug("Status", "No State Command");
                break;
        }
    }

    public void setPathState(PathState newState) {
        pathState = newState;
        pathStarted = false;
        pathTimer.resetTimer();
    }

    @Override
    public void init() {
        panelsTelemetry = PanelsTelemetry.INSTANCE.getTelemetry();

        pathState = PathState.${firstState};
        pathTimer = new Timer();
        follower = Constants.createFollower(hardwareMap);

        buildPaths();
        follower.setStartingPose(startPose);

        panelsTelemetry.debug("Status", "Initialized");
        panelsTelemetry.update(telemetry);
    }

    @Override
    public void loop() {
        follower.update();
        statePathUpdate();

        panelsTelemetry.debug("Path State", pathState.toString());
        panelsTelemetry.debug("X", follower.getPose().getX());
        panelsTelemetry.debug("Y", follower.getPose().getY());
        panelsTelemetry.debug("Heading", follower.getPose().getHeading());
        panelsTelemetry.debug("Path Time", pathTimer.getElapsedTimeSeconds());
        panelsTelemetry.update(telemetry);
    }
}
`;
}

export async function generateJavaCode(
  startPoint: Point,
  lines: Line[],
  exportMode: "full" | "class" | "coordinates" = "class",
  pathChains: PathChain[] = [],
  sequence: SequenceItem[] = [],
  className: string = "PedroAutonomous",
): Promise<string> {
  const linesWithIds = lines.map((line, idx) => ({
    ...line,
    id: line.id || `line-${idx + 1}`,
  }));
  const lineById = new Map(linesWithIds.map((line) => [line.id!, line]));

  const inputChains =
    pathChains.length > 0
      ? pathChains
      : linesWithIds.map((line, idx) => ({
          id: line.id!,
          name: line.name || `Path ${idx + 1}`,
          color: "#22c55e",
          lineIds: [line.id!],
        }));

  const normalizedChains: PathChain[] = inputChains
    .map((chain, idx) => ({
      ...chain,
      id: chain.id || `chain-${idx + 1}`,
      name: chain.name || `PathChain${idx + 1}`,
      lineIds: (chain.lineIds || []).filter((id) => lineById.has(id)),
    }))
    .filter((chain) => chain.lineIds.length > 0);

  const fieldDeclarations = normalizedChains
    .map((chain, idx) => {
      const variableName = sanitizeIdentifier(chain.name, `pathChain${idx + 1}`);
      return `public PathChain ${variableName};`;
    })
    .join("\n    ");

  const pathAssignments = normalizedChains
    .map((chain, chainIdx) => {
      const variableName = sanitizeIdentifier(chain.name, `pathChain${chainIdx + 1}`);

      const segmentSnippets = chain.lineIds
        .map((lineId) => {
          const line = lineById.get(lineId);
          if (!line) return null;

          const lineIndex = linesWithIds.findIndex((ln) => ln.id === line.id);
          const startExpression =
            lineIndex <= 0
              ? `new Pose(${startPoint.x.toFixed(3)}, ${startPoint.y.toFixed(3)})`
              : `new Pose(${linesWithIds[lineIndex - 1].endPoint.x.toFixed(3)}, ${linesWithIds[lineIndex - 1].endPoint.y.toFixed(3)})`;

          return buildPathSegmentCode(line, startExpression);
        })
        .filter((segment): segment is string => Boolean(segment));

      return `${variableName} = follower.pathBuilder()
          ${segmentSnippets.join("\n          ")}
          .build();`;
    })
    .join("\n\n      ");

  // If coordinates-only mode, return just the path assignments
  if (exportMode === "coordinates") {
    return pathAssignments;
  }

  const pathsClass = `public static class Paths {
    ${fieldDeclarations}

    public Paths(Follower follower) {
      ${pathAssignments}
    }
  }`;

  let file = "";
  if (exportMode === "class") {
    file = pathsClass;
  } else {
    file = generateFullAutonomous(startPoint, linesWithIds, sequence, className);
  }

  try {
    const javaPlugin = await loadJavaPlugin();
    const formattedCode = await prettier.format(file, {
      parser: "java",
      plugins: javaPlugin ? [javaPlugin] : [],
    });
    return formattedCode;
  } catch (error) {
    console.error("Code formatting error:", error);
    return file;
  }
}

/**
 * Generate an array of waypoints (not sampled points) along the path
 */
export function generatePointsArray(startPoint: Point, lines: Line[]): string {
  const points: BasePoint[] = [];

  // Add start point
  points.push(startPoint);

  // Add all waypoints (end points and control points)
  lines.forEach((line) => {
    // Add control points for this line
    line.controlPoints.forEach((controlPoint) => {
      points.push(controlPoint);
    });

    // Add end point of this line
    points.push(line.endPoint);
  });

  // Format as string array, removing decimal places for whole numbers
  const pointsString = points
    .map((point) => {
      const x = Number.isInteger(point.x)
        ? point.x.toFixed(1)
        : point.x.toFixed(3);
      const y = Number.isInteger(point.y)
        ? point.y.toFixed(1)
        : point.y.toFixed(3);
      return `(${x}, ${y})`;
    })
    .join(", ");

  return `[${pointsString}]`;
}

/**
 * Generate Sequential Command code
 */
export async function generateSequentialCommandCode(
  startPoint: Point,
  lines: Line[],
  fileName: string | null = null,
  sequence?: SequenceItem[],
): Promise<string> {
  // Determine class name from file name or use default
  let className = "AutoPath";
  if (fileName) {
    const baseName = fileName.split(/[\\/]/).pop() || "";
    className = baseName.replace(".pp", "").replace(/[^a-zA-Z0-9]/g, "_");
    if (!className) className = "AutoPath";
  }

  // Collect all pose names including control points
  const allPoseDeclarations: string[] = [];
  const allPoseInitializations: string[] = [];

  // Track all pose variable names
  const poseVariableNames: Map<string, string> = new Map();

  // Add start point
  allPoseDeclarations.push("  private Pose startPoint;");
  poseVariableNames.set("startPoint", "startPoint");
  allPoseInitializations.push('    startPoint = pp.get("startPoint");');

  // Process each line
  lines.forEach((line, lineIdx) => {
    const endPointName = line.name
      ? line.name.replace(/[^a-zA-Z0-9]/g, "")
      : `point${lineIdx + 1}`;

    // Add end point declaration
    allPoseDeclarations.push(`  private Pose ${endPointName};`);
    poseVariableNames.set(`point${lineIdx + 1}`, endPointName);
    allPoseInitializations.push(
      `    ${endPointName} = pp.get(\"${endPointName}\");`,
    );

    // Add control points if they exist
    if (line.controlPoints && line.controlPoints.length > 0) {
      line.controlPoints.forEach((_, controlIdx) => {
        const controlPointName = `${endPointName}_control${controlIdx + 1}`;
        allPoseDeclarations.push(`  private Pose ${controlPointName};`);
        allPoseInitializations.push(
          `    ${controlPointName} = pp.get(\"${controlPointName}\");`,
        );
        // Store for use in path building
        poseVariableNames.set(
          `${endPointName}_control${controlIdx + 1}`,
          controlPointName,
        );
      });
    }
  });

  // Generate path chain declarations
  const pathChainDeclarations = lines
    .map((_, idx) => {
      const startPoseName =
        idx === 0
          ? "startPoint"
          : lines[idx - 1]?.name
            ? lines[idx - 1]!.name!.replace(/[^a-zA-Z0-9]/g, "")
            : `point${idx}`;
      const endPoseName = lines[idx].name
        ? lines[idx].name.replace(/[^a-zA-Z0-9]/g, "")
        : `point${idx + 1}`;
      const pathName = `${startPoseName}TO${endPoseName}`;
      return `  private PathChain ${pathName};`;
    })
    .join("\n");

  // Generate ProgressTracker field
  const progressTrackerField = `  private final ProgressTracker progressTracker;`;

  // Generate addCommands calls with event handling; iterate sequence if provided
  const commands: string[] = [];

  const defaultSequence: SequenceItem[] = lines.map((ln, idx) => ({
    kind: "path",
    lineId: ln.id || `line-${idx + 1}`,
  }));
  const seq = sequence && sequence.length ? sequence : defaultSequence;

  seq.forEach((item, idx) => {
    if (item.kind === "wait") {
      commands.push(`        new WaitCommand(${(item as any).durationMs})`);
      return;
    }
    const lineIdx = lines.findIndex((l) => l.id === (item as any).lineId);
    if (lineIdx < 0) {
      return; // skip if sequence references a missing line
    }
    const line = lines[lineIdx];
    if (!line) {
      return;
    }
    const startPoseName =
      lineIdx === 0
        ? "startPoint"
        : lines[lineIdx - 1]?.name
          ? lines[lineIdx - 1]!.name!.replace(/[^a-zA-Z0-9]/g, "")
          : `point${lineIdx}`;
    const endPoseName = line.name
      ? line.name.replace(/[^a-zA-Z0-9]/g, "")
      : `point${lineIdx + 1}`;
    const pathName = `${startPoseName}TO${endPoseName}`;
    const pathDisplayName = `${startPoseName}TO${endPoseName}`;

    if (line.eventMarkers && line.eventMarkers.length > 0) {
      // Path has event markers - use reg.java style structure
      // First: InstantCommand to set up tracker
      commands.push(`        new InstantCommand(
            () -> {
              progressTracker.setCurrentChain(${pathName});
              progressTracker.setCurrentPathName("${pathDisplayName}");`);

      // Add event registrations
      line.eventMarkers.forEach((event) => {
        commands[commands.length - 1] += `
              progressTracker.registerEvent("${event.name}", ${event.position.toFixed(3)});`;
      });

      commands[commands.length - 1] += `
            })`;

      // Second: ParallelRaceGroup for following path with event handling
      commands.push(`        new ParallelRaceGroup(
            new FollowPathCommand(follower, ${pathName}),
            new SequentialCommandGroup(`);

      // Add WaitUntilCommand for each event
      line.eventMarkers.forEach((event, eventIdx) => {
        if (eventIdx > 0) commands[commands.length - 1] += ",";
        commands[commands.length - 1] += `
                new WaitUntilCommand(() -> progressTracker.shouldTriggerEvent("${event.name}")),
                new InstantCommand(
                    () -> {
                      progressTracker.executeEvent("${event.name}");
                    })`;
      });

      commands[commands.length - 1] += `
            ))`;
    } else {
      // No event markers - simple InstantCommand + FollowPathCommand
      commands.push(`        new InstantCommand(
            () -> {
              progressTracker.setCurrentChain(${pathName});
              progressTracker.setCurrentPathName("${pathDisplayName}");
            }),
        new FollowPathCommand(follower, ${pathName})`);
    }
  });

  // Generate path building
  const pathBuilders = lines
    .map((line, idx) => {
      const startPoseName =
        idx === 0
          ? "startPoint"
          : lines[idx - 1]?.name
            ? lines[idx - 1]!.name!.replace(/[^a-zA-Z0-9]/g, "")
            : `point${idx}`;
      const endPoseName = line.name
        ? line.name.replace(/[^a-zA-Z0-9]/g, "")
        : `point${idx + 1}`;
      const pathName = `${startPoseName}TO${endPoseName}`;

      const isCurve = line.controlPoints.length > 0;
      const curveType = isCurve ? "BezierCurve" : "BezierLine";

      // Build control points string
      let controlPointsStr = "";
      if (isCurve) {
        const controlPoints: string[] = [];
        line.controlPoints.forEach((_, cpIdx) => {
          const controlPointName = `${endPoseName}_control${cpIdx + 1}`;
          controlPoints.push(controlPointName);
        });
        controlPointsStr = controlPoints.join(", ") + ", ";
      }

      // Determine heading interpolation
      let headingConfig = "";
      if (line.endPoint.heading === "constant") {
        headingConfig = `setConstantHeadingInterpolation(${endPoseName}.getHeading())`;
      } else if (line.endPoint.heading === "linear") {
        headingConfig = `setLinearHeadingInterpolation(${startPoseName}.getHeading(), ${endPoseName}.getHeading())`;
      } else {
        headingConfig = `setTangentHeadingInterpolation()`;
      }

      // Build reverse config
      const reverseConfig = line.endPoint.reverse
        ? "\n            .setReversed()"
        : "";

      return `${pathName} =
        follower
            .pathBuilder()
            .addPath(new ${curveType}(${startPoseName}, ${controlPointsStr}${endPoseName}))
            .${headingConfig}${reverseConfig}
            .build();`;
    })
    .join("\n\n    ");

  const sequentialCommandCode = `
package org.firstinspires.ftc.teamcode.Commands.AutoCommands;

import com.pedropathing.follower.Follower;
import com.pedropathing.geometry.BezierCurve;
import com.pedropathing.geometry.BezierLine;
import com.pedropathing.geometry.Pose;
import com.pedropathing.paths.PathChain;
import com.qualcomm.robotcore.hardware.HardwareMap;
import com.seattlesolvers.solverslib.command.SequentialCommandGroup;
import com.seattlesolvers.solverslib.command.ParallelRaceGroup;
import com.seattlesolvers.solverslib.command.WaitUntilCommand;
import com.seattlesolvers.solverslib.command.WaitCommand;
import com.seattlesolvers.solverslib.command.InstantCommand;
import com.seattlesolvers.solverslib.pedroCommand.FollowPathCommand;
import org.firstinspires.ftc.robotcore.external.Telemetry;
import org.firstinspires.ftc.teamcode.Utils.Pathing.ProgressTracker;
import java.io.IOException;
import org.firstinspires.ftc.teamcode.Subsystems.Drivetrain;
import org.firstinspires.ftc.teamcode.Utils.PedroPathReader;

public class ${className} extends SequentialCommandGroup {

  private final Follower follower;
  ${progressTrackerField}

  // Poses
${allPoseDeclarations.join("\n")}

  // Path chains
${pathChainDeclarations}

  public ${className}(final Drivetrain drive, HardwareMap hw, Telemetry telemetry) throws IOException {
    this.follower = drive.getFollower();
    this.progressTracker = new ProgressTracker(follower, telemetry);

    PedroPathReader pp = new PedroPathReader("${fileName ? fileName.split(/[\\/]/).pop() + ".pp" || "AutoPath.pp" : "AutoPath.pp"}", hw.appContext);

    // Load poses
${allPoseInitializations.join("\n")}

    follower.setStartingPose(startPoint);

    buildPaths();

    addCommands(
${commands.join(",\n")});
  }

  public void buildPaths() {
    ${pathBuilders}
  }
}
`;

  try {
    const javaPlugin = await loadJavaPlugin();
    const formattedCode = await prettier.format(sequentialCommandCode, {
      parser: "java",
      plugins: javaPlugin ? [javaPlugin] : [],
    });
    return formattedCode;
  } catch (error) {
    console.error("Code formatting error:", error);
    return sequentialCommandCode;
  }
}
