import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlertCircle, RefreshCw, VideoOff, ExternalLink } from 'lucide-react';
import { isElectron, ipcClient } from '../../services/ipc-client';
import { cn } from '../../utils/cn';

interface LiveCapturePreviewProps {
  sourceId?: string;
  targetHwnd?: string;
  frameRate?: number;
  quality?: 'low' | 'medium' | 'high';
  isPaused?: boolean;
  onEnded?: () => void;
}

export const LiveCapturePreview: React.FC<LiveCapturePreviewProps> = ({
  sourceId,
  targetHwnd,
  frameRate = 30,
  quality = 'high',
  isPaused = false,
  onEnded,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fallbackImage, setFallbackImage] = useState<string | null>(null);

  const lastMoveTimeRef = useRef<number>(0);

  // Load thumbnail snapshot immediately while stream negotiates
  useEffect(() => {
    let isCancelled = false;

    async function loadFallbackThumbnail() {
      if (!sourceId || !isElectron) return;
      try {
        const windows = await ipcClient.getRunningWindows();
        const match = windows.find((w) => w.sourceId === sourceId || w.id === sourceId || w.handle === targetHwnd);
        if (match?.thumbnailDataUrl && !isCancelled) {
          setFallbackImage(match.thumbnailDataUrl);
        }
      } catch { }
    }

    async function startCapture() {
      if (!sourceId) {
        setLoading(false);
        return;
      }

      setError(null);
      setLoading(true);
      loadFallbackThumbnail();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      try {
        if (!isElectron) {
          setLoading(false);
          return;
        }

        // Safe resolution constraints that support everything from small dialogs to 4K displays
        const constraints: any = {
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              minWidth: 320,
              maxWidth: 3840,
              minHeight: 240,
              maxHeight: 2160,
              maxFrameRate: Math.max(frameRate, 30),
            },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            setError('Source application window closed.');
            onEnded?.();
          };
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => { });
        }

        setLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('WebRTC stream capture error, using fallback thumbnail:', err);
          if (!fallbackImage) {
            setError(err.message || 'Connecting to application window...');
          }
          setLoading(false);
        }
      }
    }

    startCapture();

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [sourceId, targetHwnd, frameRate]);

  // Handle stream pause/resume
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !isPaused;
      });
    }
  }, [isPaused]);

  // Calculate normalized coordinates in the rendered video rect
  const getNormalizedCoords = (clientX: number, clientY: number) => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const rect = video.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const natW = video.videoWidth || rect.width;
    const natH = video.videoHeight || rect.height;
    const videoRatio = natW / natH;
    const containerRatio = rect.width / rect.height;

    let renderW = rect.width;
    let renderH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (containerRatio > videoRatio) {
      renderW = rect.height * videoRatio;
      offsetX = (rect.width - renderW) / 2;
    } else {
      renderH = rect.width / videoRatio;
      offsetY = (rect.height - renderH) / 2;
    }

    const mouseX = clientX - rect.left - offsetX;
    const mouseY = clientY - rect.top - offsetY;

    if (mouseX < 0 || mouseX > renderW || mouseY < 0 || mouseY > renderH) {
      return null;
    }

    return {
      normX: Math.max(0, Math.min(1, mouseX / renderW)),
      normY: Math.max(0, Math.min(1, mouseY / renderH)),
    };
  };

  const forwardTarget = targetHwnd || (sourceId?.startsWith('window:') ? sourceId.split(':')[1] : undefined);

  const handleMouseDown = (e: React.MouseEvent) => {
    containerRef.current?.focus();
    if (!forwardTarget) return;
    const coords = getNormalizedCoords(e.clientX, e.clientY);
    if (!coords) return;

    const type = e.button === 2 ? 'context_menu' : 'mouse_down';
    ipcClient.forwardInput(forwardTarget, {
      type,
      normX: coords.normX,
      normY: coords.normY,
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!forwardTarget) return;
    const coords = getNormalizedCoords(e.clientX, e.clientY);
    if (!coords) return;
    ipcClient.forwardInput(forwardTarget, {
      type: 'mouse_up',
      normX: coords.normX,
      normY: coords.normY,
    });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!forwardTarget) return;
    const coords = getNormalizedCoords(e.clientX, e.clientY);
    if (!coords) return;
    ipcClient.forwardInput(forwardTarget, {
      type: 'double_click',
      normX: coords.normX,
      normY: coords.normY,
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!forwardTarget) return;
    const coords = getNormalizedCoords(e.clientX, e.clientY);
    if (!coords) return;
    ipcClient.forwardInput(forwardTarget, {
      type: 'context_menu',
      normX: coords.normX,
      normY: coords.normY,
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!forwardTarget) return;
    const coords = getNormalizedCoords(e.clientX, e.clientY);
    ipcClient.forwardInput(forwardTarget, {
      type: 'wheel',
      normX: coords?.normX ?? 0.5,
      normY: coords?.normY ?? 0.5,
      deltaX: e.deltaX,
      deltaY: e.deltaY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!forwardTarget) return;
    const now = performance.now();
    // Throttle move events to ~30fps (33ms) to prevent event saturation
    if (now - lastMoveTimeRef.current < 33) return;
    lastMoveTimeRef.current = now;

    const coords = getNormalizedCoords(e.clientX, e.clientY);
    if (!coords) return;
    ipcClient.forwardInput(forwardTarget, {
      type: 'move',
      normX: coords.normX,
      normY: coords.normY,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!forwardTarget) return;
    if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      ipcClient.forwardInput(forwardTarget, {
        type: 'char',
        charCode: e.key.charCodeAt(0),
      });
    } else {
      ipcClient.forwardInput(forwardTarget, {
        type: 'key',
        keyCode: e.keyCode,
      });
    }
  };

  if (error && !fallbackImage) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 p-4 text-center select-none text-slate-700">
        <AlertCircle size={24} className="text-amber-500 mb-2" />
        <span className="text-xs font-semibold text-slate-800">{error}</span>
        <span className="text-[10px] text-slate-500 mt-1 max-w-xs">
          If the application is minimized, click Focus Original in the bottom bar to restore it.
        </span>
        {sourceId && (
          <button
            onClick={() => ipcClient.focusWindow(sourceId)}
            className="mt-3 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium rounded shadow-sm inline-flex items-center gap-1.5"
          >
            <ExternalLink size={12} /> Focus Application
          </button>
        )}
      </div>
    );
  }

  if (loading && !fallbackImage) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-600 select-none">
        <RefreshCw size={22} className="animate-spin mb-2 text-primary-500" />
        <span className="text-xs font-medium">Connecting High-DPI Stream...</span>
      </div>
    );
  }

  if (!sourceId || !isElectron) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-700 p-4 select-none">
        <div className="p-3 rounded-full bg-primary-500/10 text-primary-600 mb-2">
          <VideoOff size={22} />
        </div>
        <div className="text-xs font-semibold">Active Floating Monitor</div>
        <div className="text-[10px] text-slate-500 mt-1 text-center max-w-[220px]">
          Drag and drop any running window to display it here.
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      className="w-full h-full bg-slate-100 relative flex items-center justify-center overflow-hidden outline-none cursor-default select-none"
      title="Click, scroll with mouse wheel, or type on keyboard to interact"
    >
      {/* Fallback image if WebRTC stream is buffering or negotiating */}
      {fallbackImage && !isPlaying && (
        <img
          src={fallbackImage}
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      )}

      {/* Primary hardware-accelerated high-resolution video stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => videoRef.current?.play().catch(() => { })}
        onPlaying={() => setIsPlaying(true)}
        className={cn(
          "w-full h-full object-contain pointer-events-none relative z-10 transition-opacity duration-150",
          isPlaying ? "opacity-100" : "opacity-0"
        )}
        style={{
          imageRendering: '-webkit-optimize-contrast',
        }}
      />

      {isPaused && (
        <div className="absolute inset-0 bg-white/75 backdrop-blur-sm flex items-center justify-center z-20">
          <span className="text-xs font-medium text-slate-800 px-3 py-1 rounded bg-white shadow border border-slate-200">
            Preview Paused
          </span>
        </div>
      )}
    </div>
  );
};
