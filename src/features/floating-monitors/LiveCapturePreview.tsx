import React, { useEffect, useRef, useState, useCallback } from 'react';
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

  // Safe ref callback that binds stream immediately whenever the video DOM node mounts
  const attachVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      if (el.srcObject !== streamRef.current) {
        el.srcObject = streamRef.current;
      }
      el.play().catch(() => { });
    }
  }, []);

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
              w.id === sourceId ||
              (w.title && sourceId && w.title.toLowerCase() === sourceId.toLowerCase())
          );
          if (match?.sourceId) {
            activeSourceId = match.sourceId;
          }
          if (match?.thumbnailDataUrl && !isCancelled) {
            setFallbackImage(match.thumbnailDataUrl);
          }
        }
      } catch { }

      // Normalize activeSourceId: Ensure it has window:<hwnd>:0 format
      if (!activeSourceId?.startsWith('window:')) {
        if (targetHwnd) {
          activeSourceId = `window:${targetHwnd}:0`;
        }
      }

      // Ensure target application window is restored if minimized so DWM has rendered frames
      if (isElectron && forwardTarget) {
        try {
          await ipcClient.focusWindow(forwardTarget);
        } catch { }
      }

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

        // 1. Primary: Direct window capture via getUserMedia with chromeMediaSourceId
        // This is strictly constrained by Chromium to capture ONLY the chosen window, NEVER the full desktop.
        if (activeSourceId && activeSourceId.startsWith('window:')) {
          try {
            const constraints: any = {
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: activeSourceId,
                  maxFrameRate: Math.max(frameRate, 30),
                  maxWidth: 1920,
                  maxHeight: 1080,
                },
              },
            };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch (gumErr) {
            console.warn('getUserMedia with full constraints failed, trying minimal:', gumErr);
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

        // 2. Secondary fallback: getDisplayMedia (strictly locked to window in main process)
        if (!stream && navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
          try {
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: false,
            });
          } catch (e) {
            console.warn('getDisplayMedia fallback failed:', e);
          }
        }

        if (!stream) {
          throw new Error('Target application window could not be attached. Ensure the application is open and restored.');
        }

        // Safety check: verify stream is NOT an entire desktop screen
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const trackLabel = (videoTrack.label || '').toLowerCase();
          if (trackLabel.startsWith('entire screen') || trackLabel.startsWith('screen ')) {
            videoTrack.stop();
            throw new Error('Desktop screen capture rejected. Float-Space monitors application windows only.');
          }
        }

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

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

  // Ensure stream is bound to video element whenever loading finishes or video mounts
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => { });
    }
  }, [loading, retryCount]);

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

  if (!sourceId || !isElectron) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-700 p-4 select-none">
        <div className="p-3 rounded-full bg-primary-500/10 text-primary-600 mb-2">
          <VideoOff size={22} />
        </div>
        <div className="text-xs font-semibold">Active Floating Monitor</div>
        <div className="text-[10px] text-slate-500 mt-1 text-center max-w-[220px]">
          Select any running application to display it here.
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
      {fallbackImage && (
        <img
          src={fallbackImage}
          alt=""
          className={cn(
            "absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-200",
            isPlaying ? "opacity-0" : "opacity-100"
          )}
        />
      )}

      {/* Primary hardware-accelerated video stream (ALWAYS in the DOM) */}
      <video
        ref={attachVideoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => {
          videoRef.current?.play().catch(() => { });
          setIsPlaying(true);
        }}
        onLoadedData={() => setIsPlaying(true)}
        onCanPlay={() => setIsPlaying(true)}
        onPlaying={() => setIsPlaying(true)}
        className="w-full h-full object-contain pointer-events-none relative z-10"
        style={{
          imageRendering: '-webkit-optimize-contrast',
        }}
      />

      {/* Loading Overlay (non-blocking) */}
      {loading && !fallbackImage && (
        <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-xs flex flex-col items-center justify-center text-slate-600 z-20 select-none">
          <RefreshCw size={22} className="animate-spin mb-2 text-teal-600" />
          <span className="text-xs font-medium">Connecting High-DPI Stream...</span>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 bg-[#FAF9F6]/95 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center select-none text-[#1D1D1F] z-30">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2.5">
            <AlertCircle size={22} />
          </div>
          <span className="text-xs font-semibold text-[#1D1D1F]">
            {error.includes('closed') ? 'Application Window Closed or Minimized' : error}
          </span>
          <span className="text-[11px] text-stone-500 mt-1 max-w-xs leading-relaxed">
            {error.includes('closed')
              ? 'The application window was closed or minimized to the system tray. Click below to bring it back to the screen.'
              : 'If the application is minimized or elevated, click below to focus and restore its window.'}
          </span>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleFocusAndRetry}
              className="px-3.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-600/30 text-amber-900 text-xs font-medium rounded-[6px] inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ExternalLink size={11} /> Focus & Restore
            </button>
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="px-3 py-1.5 bg-white hover:bg-stone-50 border border-black/[0.1] text-stone-700 text-xs font-medium rounded-[6px] shadow-2xs inline-flex items-center gap-1.5 transition-all cursor-pointer flex items-center"
            >
              <RotateCcw size={11} /> Retry
            </button>
          </div>
        </div>
      )}

      {/* Paused Overlay */}
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
