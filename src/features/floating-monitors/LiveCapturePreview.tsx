import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw, VideoOff, ExternalLink, RotateCcw } from 'lucide-react';
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
  const [retryCount, setRetryCount] = useState(0);

  const lastMoveTimeRef = useRef<number>(0);
  const forwardTarget = targetHwnd || (sourceId?.startsWith('window:') ? sourceId.split(':')[1] : undefined);

  useEffect(() => {
    let isCancelled = false;

    async function startCapture() {
      if (!sourceId) {
        setLoading(false);
        return;
      }

      setError(null);
      setLoading(true);

      // 1. Resolve fresh sourceId and thumbnail from main process
      let activeSourceId = sourceId;
      try {
        if (isElectron) {
          const windows = await ipcClient.getRunningWindows();
          const match = windows.find(
            (w) =>
              (targetHwnd && (w.handle === targetHwnd || w.sourceId.includes(targetHwnd))) ||
              w.sourceId === sourceId ||
              w.id === sourceId
          );
          if (match?.sourceId) {
            activeSourceId = match.sourceId;
          }
          if (match?.thumbnailDataUrl && !isCancelled) {
            setFallbackImage(match.thumbnailDataUrl);
          }
        }
      } catch { }

      // Clean up previous media stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      try {
        if (!isElectron) {
          setLoading(false);
          return;
        }

        let stream: MediaStream | null = null;

        // 1. Try modern Electron getDisplayMedia first (handled by setDisplayMediaRequestHandler)
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
          try {
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: false,
            });
          } catch (e) {
            console.warn('getDisplayMedia failed, falling back to getUserMedia:', e);
          }
        }

        // 2. Fallback to getUserMedia if getDisplayMedia didn't acquire a stream
        if (!stream && activeSourceId) {
          try {
            const constraints: any = {
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: activeSourceId,
                  maxFrameRate: Math.max(frameRate, 30),
                },
              },
            };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch (gumErr) {
            console.warn('getUserMedia with constraints failed, trying minimal constraints:', gumErr);
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                  mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: activeSourceId,
                  },
                } as any,
              });
            } catch (minErr) {
              console.warn('Minimal getUserMedia failed:', minErr);
            }
          }
        }

        if (!stream) {
          throw new Error('Could not start video source');
        }
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
          console.warn('WebRTC stream capture error:', err);
          // If this is an early attempt, automatically restore window and retry
          if (retryCount < 2) {
            setRetryCount((prev) => prev + 1);
            if (forwardTarget) {
              ipcClient.focusWindow(forwardTarget).catch(() => { });
            }
            if (forwardTarget) {
              ipcClient.focusWindow(forwardTarget).catch(() => { });
            }
            setTimeout(() => {
              if (!isCancelled) startCapture();
            }, 600);
            return;
          }

          setError(err.message || 'Could not start video source');
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
  }, [sourceId, targetHwnd, frameRate, retryCount]);

  // Handle stream pause/resume
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !isPaused;
      });
    }
  }, [isPaused]);

  // Handle user clicking to focus & restore the application, then reconnecting the stream
  const handleFocusAndRetry = async () => {
    setError(null);
    setLoading(true);
    try {
      if (forwardTarget) {
        await ipcClient.focusWindow(forwardTarget);
      } else if (sourceId) {
        await ipcClient.focusWindow(sourceId);
      }
    } catch { }

    // Wait 400ms for OS DWM to restore the window and render its frame buffer
    setTimeout(() => {
      setRetryCount((c) => c + 1);
    }, 400);
  };

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
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-5 text-center select-none text-slate-700">
        <AlertCircle size={26} className="text-amber-500 mb-2" />
        <span className="text-xs font-semibold text-slate-800">{error}</span>
        <span className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
          If the application is minimized, restoring it will immediately activate the live feed.
        </span>
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleFocusAndRetry}
            className="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-mac shadow-sm inline-flex items-center gap-1.5 transition-all"
          >
            <ExternalLink size={12} /> Focus Application & Restore
          </button>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-medium rounded-mac shadow-sm inline-flex items-center gap-1.5 transition-all"
          >
            <RotateCcw size={12} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading && !fallbackImage) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-600 select-none">
        <RefreshCw size={22} className="animate-spin mb-2 text-primary-500" />
        <span className="text-xs font-medium">Connecting High-DPI Stream...</span>
      </div>
    );
  }

  if (!sourceId || !isElectron) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-700 p-4 select-none">
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
      className="w-full h-full bg-slate-50 relative flex items-center justify-center overflow-hidden outline-none cursor-default select-none"
      title="Click, scroll with mouse wheel, or type on keyboard to interact"
    >
      {/* Fallback snapshot image while stream is connecting or if minimized */}
      {fallbackImage && !isPlaying && (
        <img
          src={fallbackImage}
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      )}

      {/* Primary hardware-accelerated video stream */}
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

      {error && fallbackImage && (
        <div className="absolute top-2 inset-x-2 z-30 flex items-center justify-between px-2.5 py-1.5 bg-amber-50/95 border border-amber-300 rounded shadow text-[10px] text-amber-900">
          <span className="flex items-center gap-1 font-medium">
            <AlertCircle size={11} className="text-amber-600" />
            Window minimized. Snapshot shown.
          </span>
          <button
            onClick={handleFocusAndRetry}
            className="px-2 py-0.5 bg-amber-600 text-white rounded font-medium hover:bg-amber-700 transition-colors"
          >
            Restore Live Feed
          </button>
        </div>
      )}

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
