import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlertCircle, RefreshCw, Monitor, Layers } from 'lucide-react';
import { isElectron, ipcClient } from '../../services/ipc-client';
import { cn } from '../../utils/cn';

interface VirtualMonitorRendererProps {
  sourceId?: string;
  isPaused?: boolean;
}

export const VirtualMonitorRenderer: React.FC<VirtualMonitorRendererProps> = ({
  sourceId: propSourceId,
  isPaused = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [appsCount, setAppsCount] = useState<number>(0);
  const [displayLabel, setDisplayLabel] = useState<string>('Display 2 (1920x1080)');

  const lastMoveTimeRef = useRef<number>(0);

  const attachVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      if (el.srcObject !== streamRef.current) {
        el.srcObject = streamRef.current;
      }
      el.play().catch(() => {});
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!isElectron) return;
    try {
      const status = await ipcClient.getVirtualDisplayStatus();
      if (status.label) setDisplayLabel(status.label);
      setAppsCount(status.appsCount);
    } catch {}
  }, []);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  useEffect(() => {
    let isCancelled = false;

    async function startStream() {
      setLoading(true);
      setError(null);

      if (!isElectron) {
        setLoading(false);
        return;
      }

      try {
        let activeSourceId = propSourceId;
        if (!activeSourceId) {
          activeSourceId = (await ipcClient.getVirtualDisplaySourceId()) || undefined;
        }

        if (!activeSourceId) {
          throw new Error('Virtual Display stream source could not be identified.');
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const constraints: any = {
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: activeSourceId,
              maxFrameRate: 60,
              maxWidth: 1920,
              maxHeight: 1080,
            },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        setLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Failed to capture virtual display');
          setLoading(false);
        }
      }
    }

    startStream();

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [propSourceId]);

  const getNormalizedCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { normX, normY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastMoveTimeRef.current < 16) return; // ~60fps input sampling
    lastMoveTimeRef.current = now;

    const coords = getNormalizedCoords(e.clientX, e.clientY);
    if (!coords) return;
    ipcClient.forwardVirtualDisplayInput({
      normX: coords.normX,
      normY: coords.normY,
      inputType: 'move',
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getNormalizedCoords(e.clientX, e.clientY);
    if (!coords) return;
    if (e.button === 0) {
      ipcClient.forwardVirtualDisplayInput({
        normX: coords.normX,
        normY: coords.normY,
        inputType: 'mouse_down',
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const coords = getNormalizedCoords(e.clientX, e.clientY);
    if (!coords) return;
    if (e.button === 0) {
      ipcClient.forwardVirtualDisplayInput({
        normX: coords.normX,
        normY: coords.normY,
        inputType: 'mouse_up',
      });
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const coords = getNormalizedCoords(e.clientX, e.clientY);
    if (!coords) return;
    ipcClient.forwardVirtualDisplayInput({
      normX: coords.normX,
      normY: coords.normY,
      inputType: 'click',
    });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const coords = getNormalizedCoords(e.clientX, e.clientY);
    if (!coords) return;
    ipcClient.forwardVirtualDisplayInput({
      normX: coords.normX,
      normY: coords.normY,
      inputType: 'double_click',
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const coords = getNormalizedCoords(e.clientX, e.clientY);
    if (!coords) return;
    ipcClient.forwardVirtualDisplayInput({
      normX: coords.normX,
      normY: coords.normY,
      inputType: 'context_menu',
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    const coords = getNormalizedCoords(e.clientX, e.clientY);
    if (!coords) return;
    ipcClient.forwardVirtualDisplayInput({
      normX: coords.normX,
      normY: coords.normY,
      inputType: 'wheel',
      deltaX: e.deltaX,
      deltaY: e.deltaY,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!containerRef.current) return;
    if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      ipcClient.forwardVirtualDisplayInput({
        normX: 0.5,
        normY: 0.5,
        inputType: 'char',
        charCode: e.key.charCodeAt(0),
      });
    } else {
      ipcClient.forwardVirtualDisplayInput({
        normX: 0.5,
        normY: 0.5,
        inputType: 'key',
        keyCode: e.keyCode,
      });
    }
  };

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAF9F6] p-6 text-center select-none text-[#1D1D1F]">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-sm font-semibold mb-1">Virtual Display Connecting</h3>
        <p className="text-xs text-stone-500 max-w-sm mb-4 leading-relaxed">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-3.5 py-1.5 text-xs font-medium text-[#1D1D1F] bg-white hover:bg-stone-50 border border-black/[0.12] rounded-[6px] shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw size={12} />
          <span>Retry Stream</span>
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAF9F6] text-stone-600 select-none">
        <RefreshCw size={24} className="animate-spin mb-3 text-stone-500" />
        <span className="text-xs font-medium">Connecting Virtual Display Stream (60 FPS)...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden outline-none cursor-crosshair select-none"
      title="Virtual Extended Display: Clicks, typing, scrolling, and dragging active"
    >
      <video
        ref={attachVideoRef}
        autoPlay
        playsInline
        muted
        onPlaying={() => setIsPlaying(true)}
        className={cn(
          'w-full h-full object-contain pointer-events-none relative z-10 transition-opacity duration-150',
          isPlaying ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Top Floating Badge on Hover */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 pointer-events-none opacity-80 hover:opacity-100 transition-opacity">
        <span className="px-2 py-0.5 rounded-[4px] bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white flex items-center gap-1 shadow-xs">
          <Monitor size={10} className="text-emerald-400" />
          <span>{displayLabel}</span>
        </span>
        {appsCount > 0 && (
          <span className="px-2 py-0.5 rounded-[4px] bg-emerald-500/80 backdrop-blur-md text-[10px] font-semibold text-white flex items-center gap-1 shadow-xs">
            <Layers size={10} />
            <span>{appsCount} {appsCount === 1 ? 'App' : 'Apps'} Active</span>
          </span>
        )}
      </div>

      {isPaused && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-30">
          <span className="text-xs font-medium text-stone-800 px-3 py-1.5 rounded-[6px] bg-white shadow-md border border-black/10">
            Stream Paused
          </span>
        </div>
      )}
    </div>
  );
};
