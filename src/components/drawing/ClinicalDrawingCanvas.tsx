import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  PenTool, 
  Eraser, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Save, 
  Download, 
  Check, 
  Sparkles,
  Maximize2
} from 'lucide-react';

interface ClinicalDrawingCanvasProps {
  initialImage?: string;
  onSave?: (dataUrl: string) => void;
  onClose?: () => void;
  patientName?: string;
}

const CLINICAL_COLORS = [
  { name: 'Lesion / Inflammation Red', value: '#ef4444' },
  { name: 'Anatomical Mark Blue', value: '#2563eb' },
  { name: 'Clinical Charcoal', value: '#1e293b' },
  { name: 'Pain / Warning Amber', value: '#f59e0b' },
  { name: 'Normal / Cleared Green', value: '#10b981' },
  { name: 'Deep Purple / Bruising', value: '#8b5cf6' },
];

const BRUSH_SIZES = [
  { label: 'Fine (2px)', value: 2 },
  { label: 'Medium (4px)', value: 4 },
  { label: 'Bold (8px)', value: 8 },
  { label: 'Marker (16px)', value: 16 },
];

export const ClinicalDrawingCanvas: React.FC<ClinicalDrawingCanvasProps> = ({
  initialImage,
  onSave,
  onClose,
  patientName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'brush' | 'eraser'>('brush');
  const [color, setColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(4);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSaved, setIsSaved] = useState(false);
  const [savedPreview, setSavedPreview] = useState<string | null>(initialImage || null);

  // Initialize canvas with pure white background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = 720;
    canvas.height = 480;

    if (initialImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        saveState();
      };
      img.src = initialImage;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveState();
    }
  }, []);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, imageData];
    });
    setHistoryIndex((prev) => prev + 1);
    setIsSaved(false);
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const newIndex = historyIndex - 1;
      ctx.putImageData(history[newIndex], 0, 0);
      setHistoryIndex(newIndex);
      setIsSaved(false);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const newIndex = historyIndex + 1;
      ctx.putImageData(history[newIndex], 0, 0);
      setHistoryIndex(newIndex);
      setIsSaved(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
    setSavedPreview(null);
  };

  // Anatomical Guides/Templates
  const loadTemplate = (type: 'blank' | 'thorax' | 'body') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (type === 'thorax') {
      ctx.save();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      // Outer ribcage boundary
      ctx.beginPath();
      ctx.moveTo(290, 80);
      ctx.bezierCurveTo(360, 70, 430, 80, 480, 160);
      ctx.bezierCurveTo(520, 240, 500, 360, 430, 410);
      ctx.bezierCurveTo(360, 420, 290, 420, 220, 410);
      ctx.bezierCurveTo(150, 360, 130, 240, 170, 160);
      ctx.bezierCurveTo(220, 80, 290, 70, 360, 80);
      ctx.stroke();

      // Trachea & Main Bronchi
      ctx.setLineDash([]);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(360, 80);
      ctx.lineTo(360, 180);
      ctx.lineTo(440, 240);
      ctx.moveTo(360, 180);
      ctx.lineTo(280, 240);
      ctx.stroke();

      // Bilateral Lung fields
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;

      // Right lung (anatomical right = viewer left)
      ctx.beginPath();
      ctx.ellipse(270, 280, 75, 110, 0, 0, 2 * Math.PI);
      ctx.stroke();

      // Left lung (anatomical left = viewer right)
      ctx.beginPath();
      ctx.ellipse(450, 280, 75, 110, 0, 0, 2 * Math.PI);
      ctx.stroke();

      // Guide Text
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText('RIGHT LUNG (PA)', 225, 175);
      ctx.fillText('LEFT LUNG (PA)', 415, 175);
      ctx.fillText('ANATOMICAL THORAX TEMPLATE', 20, 35);
      ctx.restore();
    } else if (type === 'body') {
      ctx.save();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Head
      ctx.arc(360, 80, 35, 0, 2 * Math.PI);
      // Torso
      ctx.rect(325, 120, 70, 140);
      // Arms
      ctx.moveTo(325, 130); ctx.lineTo(260, 240);
      ctx.moveTo(395, 130); ctx.lineTo(460, 240);
      // Legs
      ctx.moveTo(340, 260); ctx.lineTo(330, 420);
      ctx.moveTo(380, 260); ctx.lineTo(390, 420);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText('ANTERIOR BODY TEMPLATE', 20, 35);
      ctx.restore();
    }

    saveState();
  };

  // Coordinate normalizer for mouse / touch / stylus
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = brushSize * 2.5;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
    }

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveState();
    }
  };

  // Convert to JPEG format and export
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert directly to high quality JPEG
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setSavedPreview(jpegDataUrl);
    setIsSaved(true);

    if (onSave) {
      onSave(jpegDataUrl);
    }
  };

  const downloadDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `clinical-finding-${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Top Toolbar */}
      <div className="bg-slate-50/80 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <PenTool className="w-3.5 h-3.5 text-blue-600" />
            Clinical Findings Drawing
          </span>
          {patientName && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
              Patient: {patientName}
            </span>
          )}
        </div>

        {/* Template Selector */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="font-medium text-slate-600">Templates:</span>
          <button
            type="button"
            onClick={() => loadTemplate('blank')}
            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 transition"
          >
            Blank White
          </button>
          <button
            type="button"
            onClick={() => loadTemplate('thorax')}
            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 transition flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-blue-500" />
            Thorax (CXR)
          </button>
          <button
            type="button"
            onClick={() => loadTemplate('body')}
            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 transition"
          >
            Body Outline
          </button>
        </div>
      </div>

      {/* Main Tool Bar */}
      <div className="px-4 py-2.5 bg-slate-100/60 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-sm">
        {/* Tool Mode: Brush vs Eraser */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setCurrentTool('brush')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              currentTool === 'brush'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            Brush
          </button>
          <button
            type="button"
            onClick={() => setCurrentTool('eraser')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              currentTool === 'eraser'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            Eraser
          </button>
        </div>

        {/* Color Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Color:</span>
          <div className="flex items-center gap-1.5">
            {CLINICAL_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                onClick={() => {
                  setColor(c.value);
                  setCurrentTool('brush');
                }}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  color === c.value && currentTool === 'brush'
                    ? 'scale-110 border-slate-900 shadow-sm'
                    : 'border-white hover:scale-105'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Size:</span>
          <div className="flex items-center gap-1">
            {BRUSH_SIZES.map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => setBrushSize(b.value)}
                className={`px-2 py-1 text-xs rounded border transition ${
                  brushSize === b.value
                    ? 'bg-slate-900 text-white border-slate-900 font-medium'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {b.value}px
              </button>
            ))}
          </div>
        </div>

        {/* Undo / Redo / Clear */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo"
            className="p-1.5 rounded text-slate-600 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition border border-transparent hover:border-slate-200"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo"
            className="p-1.5 rounded text-slate-600 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition border border-transparent hover:border-slate-200"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={clearCanvas}
            title="Clear Canvas"
            className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drawing Canvas Area */}
      <div className="p-4 bg-slate-200/50 flex flex-col items-center justify-center overflow-x-auto">
        <div className="relative shadow-md rounded border border-slate-300 bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair block touch-none"
            style={{ width: '100%', maxWidth: '720px', height: 'auto', aspectRatio: '720/480' }}
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-2 text-center">
          Touch or click & drag to illustrate clinical findings, lesions, or surgical markings. Converted to JPEG on save.
        </p>
      </div>

      {/* Bottom Save & Action Bar */}
      <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadDrawing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export JPEG
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Drawing attached to record
            </span>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Done
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition"
          >
            <Save className="w-3.5 h-3.5" />
            Save Drawing Findings
          </button>
        </div>
      </div>
    </div>
  );
};
