"use client";

import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from "react";
import { Canvas, PencilBrush, CircleBrush, SprayBrush, FabricObject, Rect, Circle, Line, IText } from "fabric";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Pencil,
  Eraser,
  Circle as CircleIcon,
  Square,
  Minus,
  Type,
  MousePointer2,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Paintbrush,
  SprayCanIcon,
  PenTool,
  Droplets,
  PaintBucket,
} from "lucide-react";
import { StrokeEvent, EraseEvent } from "@/types/moner-canvus";
import { v4 as uuidv4 } from "uuid";

// Tool types
type ToolType = 
  | "pencil" 
  | "marker" 
  | "circle" 
  | "spray" 
  | "airbrush"
  | "calligraphy"
  | "eraser" 
  | "select" 
  | "rect" 
  | "oval" 
  | "line" 
  | "text"
  | "fill";

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
  "#000000", "#FFFFFF", "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280", "#14B8A6", "#F43F5E",
];

const BRUSH_TOOLS: { id: ToolType; label: string; icon: React.ReactNode }[] = [
  { id: "pencil", label: "Pencil", icon: <Pencil className="h-4 w-4" /> },
  { id: "marker", label: "Marker", icon: <Paintbrush className="h-4 w-4" /> },
  { id: "circle", label: "Circle Brush", icon: <Droplets className="h-4 w-4" /> },
  { id: "spray", label: "Spray", icon: <SprayCanIcon className="h-4 w-4" /> },
  { id: "airbrush", label: "Airbrush", icon: <Droplets className="h-4 w-4 rotate-45" /> },
  { id: "calligraphy", label: "Calligraphy", icon: <PenTool className="h-4 w-4" /> },
  { id: "eraser", label: "Eraser", icon: <Eraser className="h-4 w-4" /> },
];

const SHAPE_TOOLS: { id: ToolType; label: string; icon: React.ReactNode }[] = [
  { id: "rect", label: "Rectangle", icon: <Square className="h-4 w-4" /> },
  { id: "oval", label: "Oval", icon: <CircleIcon className="h-4 w-4" /> },
  { id: "line", label: "Line", icon: <Minus className="h-4 w-4" /> },
  { id: "text", label: "Text", icon: <Type className="h-4 w-4" /> },
  { id: "fill", label: "Fill", icon: <PaintBucket className="h-4 w-4" /> },
  { id: "select", label: "Select", icon: <MousePointer2 className="h-4 w-4" /> },
];

const CanvasPane = forwardRef<CanvasPaneRef, CanvasPaneProps>(
  ({ sessionStart, isRunning, onStrokeComplete, onEraseComplete }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<Canvas | null>(null);
    
    // Tool state
    const [activeTool, setActiveTool] = useState<ToolType>("pencil");
    const [color, setColor] = useState("#000000");
    const [brushSize, setBrushSize] = useState(5);
    const [opacity, setOpacity] = useState(100);
    
    // Use refs to track current values for event handlers
    const activeToolRef = useRef(activeTool);
    const colorRef = useRef(color);
    const brushSizeRef = useRef(brushSize);
    const opacityRef = useRef(opacity);
    const isRunningRef = useRef(isRunning);
    const sessionStartRef = useRef(sessionStart);
    
    // Keep refs in sync
    useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
    useEffect(() => { colorRef.current = color; }, [color]);
    useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
    useEffect(() => { opacityRef.current = opacity; }, [opacity]);
    useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
    useEffect(() => { sessionStartRef.current = sessionStart; }, [sessionStart]);
    
    // History state
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef(-1);
    const isLoadingRef = useRef(false);
    
    // Keep history refs in sync
    useEffect(() => { historyRef.current = history; }, [history]);
    useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);
    
    // Stroke tracking
    const currentStrokeRef = useRef<StrokeEvent | null>(null);
    
    // Shape drawing state
    const isDrawingShapeRef = useRef(false);
    const shapeStartRef = useRef({ x: 0, y: 0 });
    const currentShapeRef = useRef<FabricObject | null>(null);

    // Helper to get RGBA color
    const getRGBA = useCallback((hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
    }, []);

    // Save canvas state to history
    const saveState = useCallback(() => {
      if (!fabricRef.current || isLoadingRef.current) return;
      
      const json = JSON.stringify(fabricRef.current.toJSON());
      const currentHistory = historyRef.current;
      const currentIndex = historyIndexRef.current;
      
      // Remove any future states if we're not at the end
      const newHistory = currentHistory.slice(0, currentIndex + 1);
      newHistory.push(json);
      // Keep only last 50 states
      if (newHistory.length > 50) newHistory.shift();
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }, []);

    // Undo function
    const handleUndo = useCallback(() => {
      if (!fabricRef.current || historyIndexRef.current <= 0) return;
      
      isLoadingRef.current = true;
      const newIndex = historyIndexRef.current - 1;
      const state = historyRef.current[newIndex];
      
      fabricRef.current.loadFromJSON(JSON.parse(state)).then(() => {
        fabricRef.current?.renderAll();
        setHistoryIndex(newIndex);
        isLoadingRef.current = false;
      });
    }, []);

    // Redo function
    const handleRedo = useCallback(() => {
      if (!fabricRef.current || historyIndexRef.current >= historyRef.current.length - 1) return;
      
      isLoadingRef.current = true;
      const newIndex = historyIndexRef.current + 1;
      const state = historyRef.current[newIndex];
      
      fabricRef.current.loadFromJSON(JSON.parse(state)).then(() => {
        fabricRef.current?.renderAll();
        setHistoryIndex(newIndex);
        isLoadingRef.current = false;
      });
    }, []);

    // Clear canvas
    const clearCanvas = useCallback(() => {
      if (!fabricRef.current) return;
      fabricRef.current.clear();
      fabricRef.current.backgroundColor = "#FFFFFF";
      fabricRef.current.renderAll();
      saveState();
    }, [saveState]);

    // Download canvas
    const downloadCanvas = useCallback(() => {
      if (!fabricRef.current) return;
      const dataURL = fabricRef.current.toDataURL({ format: "png", quality: 1, multiplier: 2 });
      const link = document.createElement("a");
      link.download = `moner-canvus-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
    }, []);

    // Configure brush based on tool
    const configureBrush = useCallback(() => {
      if (!fabricRef.current) return;
      
      const canvas = fabricRef.current;
      const tool = activeToolRef.current;
      const c = colorRef.current;
      const size = brushSizeRef.current;
      const op = opacityRef.current;
      
      // Disable drawing mode for shape/select tools
      if (["rect", "oval", "line", "text", "fill", "select"].includes(tool)) {
        canvas.isDrawingMode = false;
        canvas.selection = tool === "select";
        return;
      }
      
      // Enable drawing mode for brush tools
      canvas.isDrawingMode = true;
      canvas.selection = false;
      
      let brush;
      switch (tool) {
        case "pencil":
          brush = new PencilBrush(canvas);
          brush.color = getRGBA(c, op);
          brush.width = size;
          break;
          
        case "marker":
          brush = new PencilBrush(canvas);
          brush.color = getRGBA(c, Math.min(op, 60));
          brush.width = size * 3;
          break;
          
        case "circle":
          brush = new CircleBrush(canvas);
          brush.color = getRGBA(c, op);
          brush.width = size;
          break;
          
        case "spray":
          brush = new SprayBrush(canvas);
          brush.color = getRGBA(c, op);
          brush.width = size * 2;
          (brush as SprayBrush).density = 20;
          break;
          
        case "airbrush":
          brush = new SprayBrush(canvas);
          brush.color = getRGBA(c, Math.min(op, 30));
          brush.width = size * 4;
          (brush as SprayBrush).density = 50;
          break;
          
        case "calligraphy":
          brush = new PencilBrush(canvas);
          brush.color = getRGBA(c, op);
          brush.width = size;
          break;
          
        case "eraser":
          brush = new PencilBrush(canvas);
          brush.color = "#FFFFFF";
          brush.width = size * 2;
          break;
          
        default:
          brush = new PencilBrush(canvas);
          brush.color = getRGBA(c, op);
          brush.width = size;
      }
      
      canvas.freeDrawingBrush = brush;
    }, [getRGBA]);

    // Initialize Fabric.js canvas
    useEffect(() => {
      if (!canvasRef.current || fabricRef.current) return;

      const canvas = new Canvas(canvasRef.current, {
        isDrawingMode: true,
        backgroundColor: "#FFFFFF",
        width: 900,
        height: 550,
        selection: false,
      });

      fabricRef.current = canvas;
      
      // Initial brush setup
      const brush = new PencilBrush(canvas);
      brush.color = "#000000";
      brush.width = 5;
      canvas.freeDrawingBrush = brush;

      // Save initial state
      const initialState = JSON.stringify(canvas.toJSON());
      setHistory([initialState]);
      setHistoryIndex(0);

      // Path created event (for freehand drawing)
      canvas.on("path:created", () => {
        if (!isLoadingRef.current) {
          saveState();
        }
      });

      // Object modified event
      canvas.on("object:modified", () => {
        if (!isLoadingRef.current) {
          saveState();
        }
      });

      // Mouse down handler
      canvas.on("mouse:down", (opt) => {
        if (!isRunningRef.current || !sessionStartRef.current) return;
        
        const pointer = canvas.getPointer(opt.e);
        const now = performance.now();
        const tool = activeToolRef.current;
        const c = colorRef.current;
        const size = brushSizeRef.current;
        const op = opacityRef.current;
        const start = sessionStartRef.current;
        
        // Handle shape drawing
        if (["rect", "oval", "line"].includes(tool)) {
          isDrawingShapeRef.current = true;
          shapeStartRef.current = { x: pointer.x, y: pointer.y };
          
          const strokeColor = getRGBA(c, op);
          let shape: FabricObject;
          
          if (tool === "rect") {
            shape = new Rect({
              left: pointer.x,
              top: pointer.y,
              width: 1,
              height: 1,
              fill: "transparent",
              stroke: strokeColor,
              strokeWidth: size,
              selectable: true,
            });
          } else if (tool === "oval") {
            shape = new Circle({
              left: pointer.x,
              top: pointer.y,
              radius: 1,
              fill: "transparent",
              stroke: strokeColor,
              strokeWidth: size,
              selectable: true,
            });
          } else {
            shape = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
              stroke: strokeColor,
              strokeWidth: size,
              selectable: true,
            });
          }
          
          currentShapeRef.current = shape;
          canvas.add(shape);
          canvas.renderAll();
          return;
        }
        
        // Handle text tool
        if (tool === "text") {
          const text = new IText("Type here...", {
            left: pointer.x,
            top: pointer.y,
            fontSize: size * 4,
            fill: c,
            fontFamily: "Arial",
          });
          canvas.add(text);
          canvas.setActiveObject(text);
          text.enterEditing();
          saveState();
          return;
        }
        
        // Handle fill tool
        if (tool === "fill") {
          const target = canvas.findTarget(opt.e);
          if (target) {
            target.set("fill", getRGBA(c, op));
            canvas.renderAll();
            saveState();
          }
          return;
        }
        
        // Track stroke for freehand drawing
        if (canvas.isDrawingMode) {
          currentStrokeRef.current = {
            id: uuidv4(),
            tool: tool === "eraser" ? "eraser" : "pen",
            color: tool === "eraser" ? "#FFFFFF" : c,
            width: size,
            points: [{ x: pointer.x, y: pointer.y, t: now - start }],
            createdAt: now - start,
          };
        }
      });

      // Mouse move handler
      canvas.on("mouse:move", (opt) => {
        const pointer = canvas.getPointer(opt.e);
        const tool = activeToolRef.current;
        
        // Handle shape drawing
        if (isDrawingShapeRef.current && currentShapeRef.current) {
          const shape = currentShapeRef.current;
          const start = shapeStartRef.current;
          
          if (tool === "rect") {
            const width = Math.abs(pointer.x - start.x);
            const height = Math.abs(pointer.y - start.y);
            shape.set({
              left: Math.min(start.x, pointer.x),
              top: Math.min(start.y, pointer.y),
              width,
              height,
            });
          } else if (tool === "oval") {
            const rx = Math.abs(pointer.x - start.x) / 2;
            const ry = Math.abs(pointer.y - start.y) / 2;
            (shape as Circle).set({ 
              radius: Math.max(rx, ry),
              left: Math.min(start.x, pointer.x),
              top: Math.min(start.y, pointer.y),
            });
          } else if (tool === "line") {
            (shape as Line).set({ x2: pointer.x, y2: pointer.y });
          }
          
          canvas.renderAll();
          return;
        }
        
        // Track stroke points
        if (currentStrokeRef.current && sessionStartRef.current) {
          const now = performance.now();
          currentStrokeRef.current.points.push({
            x: pointer.x,
            y: pointer.y,
            t: now - sessionStartRef.current,
          });
        }
      });

      // Mouse up handler
      canvas.on("mouse:up", () => {
        // Complete shape drawing
        if (isDrawingShapeRef.current) {
          isDrawingShapeRef.current = false;
          currentShapeRef.current = null;
          saveState();
        }
        
        // Complete stroke tracking
        if (currentStrokeRef.current) {
          if (currentStrokeRef.current.tool === "eraser") {
            onEraseComplete({
              id: currentStrokeRef.current.id,
              createdAt: currentStrokeRef.current.createdAt,
            });
          } else {
            onStrokeComplete(currentStrokeRef.current);
          }
          currentStrokeRef.current = null;
        }
      });

      return () => {
        canvas.dispose();
        fabricRef.current = null;
      };
    }, [saveState, getRGBA, onStrokeComplete, onEraseComplete]);

    // Update brush when tool/settings change
    useEffect(() => {
      configureBrush();
    }, [activeTool, color, brushSize, opacity, configureBrush]);

    // Enable/disable based on session state
    useEffect(() => {
      if (fabricRef.current) {
        if (!isRunning) {
          fabricRef.current.isDrawingMode = false;
          fabricRef.current.selection = false;
        } else {
          configureBrush();
        }
      }
    }, [isRunning, configureBrush]);

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
          e.preventDefault();
          handleRedo();
        }
        if (e.key === "Delete" || e.key === "Backspace") {
          const canvas = fabricRef.current;
          if (canvas) {
            const activeObjects = canvas.getActiveObjects();
            if (activeObjects.length > 0) {
              activeObjects.forEach(obj => canvas.remove(obj));
              canvas.discardActiveObject();
              saveState();
            }
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleUndo, handleRedo, saveState]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      exportImage: () => {
        if (!fabricRef.current) return "";
        return fabricRef.current.toDataURL({ format: "png", quality: 0.8, multiplier: 1 });
      },
      clearCanvas,
    }));

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    return (
      <TooltipProvider>
        <div className="flex flex-col gap-3">
          {/* Main Toolbar */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-card rounded-lg border">
            {/* Brush Tools */}
            <div className="flex items-center gap-1">
              {BRUSH_TOOLS.map((tool) => (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeTool === tool.id ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setActiveTool(tool.id)}
                      disabled={!isRunning}
                      className="h-8 w-8"
                    >
                      {tool.icon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{tool.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>

            <Separator orientation="vertical" className="h-8" />

            {/* Shape Tools */}
            <div className="flex items-center gap-1">
              {SHAPE_TOOLS.map((tool) => (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeTool === tool.id ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setActiveTool(tool.id)}
                      disabled={!isRunning}
                      className="h-8 w-8"
                    >
                      {tool.icon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{tool.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>

            <Separator orientation="vertical" className="h-8" />

            {/* History Actions */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleUndo}
                    disabled={!canUndo || !isRunning}
                    className="h-8 w-8"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRedo}
                    disabled={!canRedo || !isRunning}
                    className="h-8 w-8"
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
              </Tooltip>
            </div>

            <Separator orientation="vertical" className="h-8" />

            {/* Canvas Actions */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearCanvas}
                    disabled={!isRunning}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear Canvas</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={downloadCanvas} className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download PNG</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Settings Bar */}
          <div className="flex flex-wrap items-center gap-4 p-3 bg-card rounded-lg border">
            {/* Color Picker */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Color</Label>
              <div className="flex gap-1 flex-wrap max-w-[200px]">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    disabled={!isRunning || activeTool === "eraser"}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      color === c && activeTool !== "eraser"
                        ? "border-primary scale-110 ring-2 ring-primary/30"
                        : "border-transparent hover:scale-105"
                    } ${!isRunning || activeTool === "eraser" ? "opacity-50" : ""}`}
                    style={{ backgroundColor: c, borderColor: c === "#FFFFFF" ? "#e5e7eb" : undefined }}
                  />
                ))}
              </div>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Brush Size */}
            <div className="flex items-center gap-2 min-w-[140px]">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Size: {brushSize}</Label>
              <Slider
                value={[brushSize]}
                onValueChange={(v) => setBrushSize(v[0])}
                min={1}
                max={50}
                step={1}
                disabled={!isRunning}
                className="w-20"
              />
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Opacity */}
            <div className="flex items-center gap-2 min-w-[140px]">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Opacity: {opacity}%</Label>
              <Slider
                value={[opacity]}
                onValueChange={(v) => setOpacity(v[0])}
                min={10}
                max={100}
                step={5}
                disabled={!isRunning || activeTool === "eraser"}
                className="w-20"
              />
            </div>
          </div>

          {/* Canvas */}
          <div className="relative border rounded-lg overflow-hidden bg-white shadow-lg">
            <canvas ref={canvasRef} className="block" style={{ touchAction: "none" }} />
            {!isRunning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
                <div className="text-center space-y-2 bg-background/80 p-6 rounded-lg shadow-lg">
                  <Paintbrush className="h-8 w-8 mx-auto text-primary" />
                  <p className="text-muted-foreground font-medium">Click "Start Session" to begin drawing</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Keyboard Shortcuts Help */}
          <div className="text-xs text-muted-foreground text-center">
            <span className="inline-flex gap-4">
              <span><kbd className="px-1.5 py-0.5 rounded bg-muted">Ctrl+Z</kbd> Undo</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-muted">Ctrl+Y</kbd> Redo</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-muted">Del</kbd> Delete selected</span>
            </span>
          </div>
        </div>
      </TooltipProvider>
    );
  }
);

CanvasPane.displayName = "CanvasPane";

export default CanvasPane;
