"use client";

import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";
import { Canvas, PencilBrush, FabricObject } from "fabric";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Pencil, Eraser } from "lucide-react";
import { StrokeEvent, StrokePoint, EraseEvent, DrawingTool } from "@/types/moner-canvus";
import { v4 as uuidv4 } from "uuid";

interface CanvasPaneProps {
  sessionStart: number | null;
  isRunning: boolean;
  onStrokeComplete: (stroke: StrokeEvent) => void;
  onEraseComplete: (erase: EraseEvent) => void;
}

export interface CanvasPaneRef {
  exportImage: () => string;
  clearCanvas: () => void;
}

const COLORS = [
  "#000000", // Black
  "#FFFFFF", // White
  "#EF4444", // Red
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#22C55E", // Green
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#6B7280", // Gray
];

const CanvasPane = forwardRef<CanvasPaneRef, CanvasPaneProps>(
  ({ sessionStart, isRunning, onStrokeComplete, onEraseComplete }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<Canvas | null>(null);
    const [tool, setTool] = useState<DrawingTool>("pen");
    const [color, setColor] = useState("#000000");
    const [brushSize, setBrushSize] = useState(5);
    const currentStrokeRef = useRef<StrokeEvent | null>(null);

    // Initialize Fabric.js canvas
    useEffect(() => {
      if (!canvasRef.current || fabricRef.current) return;

      const canvas = new Canvas(canvasRef.current, {
        isDrawingMode: true,
        backgroundColor: "#FFFFFF",
        width: 800,
        height: 600,
      });

      // Set up the brush
      const brush = new PencilBrush(canvas);
      brush.color = color;
      brush.width = brushSize;
      canvas.freeDrawingBrush = brush;

      fabricRef.current = canvas;

      // Handle drawing events
      canvas.on("mouse:down", (opt) => {
        if (!isRunning || !sessionStart) return;
        
        const pointer = canvas.getPointer(opt.e);
        const now = performance.now();
        
        currentStrokeRef.current = {
          id: uuidv4(),
          tool: tool,
          color: tool === "eraser" ? "#FFFFFF" : color,
          width: brushSize,
          points: [{ x: pointer.x, y: pointer.y, t: now - sessionStart }],
          createdAt: now - sessionStart,
        };
      });

      canvas.on("mouse:move", (opt) => {
        if (!currentStrokeRef.current || !sessionStart) return;
        
        const pointer = canvas.getPointer(opt.e);
        const now = performance.now();
        
        currentStrokeRef.current.points.push({
          x: pointer.x,
          y: pointer.y,
          t: now - sessionStart,
        });
      });

      canvas.on("mouse:up", () => {
        if (!currentStrokeRef.current) return;
        
        if (currentStrokeRef.current.tool === "eraser") {
          onEraseComplete({
            id: currentStrokeRef.current.id,
            createdAt: currentStrokeRef.current.createdAt,
          });
        } else {
          onStrokeComplete(currentStrokeRef.current);
        }
        
        currentStrokeRef.current = null;
      });

      return () => {
        canvas.dispose();
        fabricRef.current = null;
      };
    }, []);

    // Update brush settings when tool/color/size changes
    useEffect(() => {
      if (!fabricRef.current?.freeDrawingBrush) return;

      const brush = fabricRef.current.freeDrawingBrush;
      brush.color = tool === "eraser" ? "#FFFFFF" : color;
      brush.width = brushSize;
    }, [tool, color, brushSize]);

    // Enable/disable drawing mode based on session state
    useEffect(() => {
      if (fabricRef.current) {
        fabricRef.current.isDrawingMode = isRunning;
      }
    }, [isRunning]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      exportImage: () => {
        if (!fabricRef.current) return "";
        return fabricRef.current.toDataURL({
          format: "png",
          quality: 0.8,
          multiplier: 1,
        });
      },
      clearCanvas: () => {
        if (!fabricRef.current) return;
        fabricRef.current.clear();
        fabricRef.current.backgroundColor = "#FFFFFF";
        fabricRef.current.renderAll();
      },
    }));

    return (
      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-lg border">
          {/* Tool Selection */}
          <div className="flex gap-2">
            <Button
              variant={tool === "pen" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("pen")}
              disabled={!isRunning}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Pen
            </Button>
            <Button
              variant={tool === "eraser" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("eraser")}
              disabled={!isRunning}
            >
              <Eraser className="h-4 w-4 mr-1" />
              Eraser
            </Button>
          </div>

          {/* Color Picker */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Color:</Label>
            <div className="flex gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  disabled={!isRunning || tool === "eraser"}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    color === c && tool !== "eraser"
                      ? "border-primary scale-110"
                      : "border-transparent"
                  } ${!isRunning || tool === "eraser" ? "opacity-50" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Brush Size */}
          <div className="flex items-center gap-2 min-w-[150px]">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">
              Size: {brushSize}px
            </Label>
            <Slider
              value={[brushSize]}
              onValueChange={(v) => setBrushSize(v[0])}
              min={1}
              max={50}
              step={1}
              disabled={!isRunning}
              className="w-24"
            />
          </div>
        </div>

        {/* Canvas */}
        <div className="relative border rounded-lg overflow-hidden bg-white shadow-inner">
          <canvas
            ref={canvasRef}
            className="block"
            style={{ touchAction: "none" }}
          />
          {!isRunning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
              <p className="text-muted-foreground text-lg font-medium">
                Click "Start Session" to begin drawing
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
);

CanvasPane.displayName = "CanvasPane";

export default CanvasPane;
