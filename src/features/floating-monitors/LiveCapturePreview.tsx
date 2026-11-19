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
      if (!sourceId && !targetHwnd) {
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
          if (match?.iconDataUrl && !isCancelled) {
            setFallbackImage(match.iconDataUrl);
          }
        }
      } catch { }

      // Normalize activeSourceId: Ensure it has window:<hwnd>:0 format
      if (!activeSourceId?.startsWith('window:')) {
        if (targetHwnd) {
          activeSourceId = `window:${targetHwnd}:0`;
        }
      }

      // Ensure target application window is restored if minimized so DWM renders frames
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
            console.warn('getUserMedia with full constraints failed, attempting fallback...', gumErr);
          }
        }

        // 2. Fallback: Request display media handler directly
        if (!stream) {
          try {
            const fallbackConstraints: any = {
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  maxFrameRate: Math.max(frameRate, 30),
                },
              },
            };
            stream = await (navigator.mediaDevices as any).getUserMedia(fallbackConstraints);
          } catch (fbErr) {
            console.warn('Standard getUserMedia fallback failed:', fbErr);
          }
        }

        if (isCancelled) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }

        if (!stream) {
          throw new Error('Could not establish live stream for the selected application.');
        }

        streamRef.current = stream;

        // Bind stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => { });
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            if (!isCancelled) {
              setError('Application Window Closed or Minimized');
              onEnded?.();
            }
          };
        }

        setLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error starting live window capture:', err);
          setError(err?.message || 'Failed to capture application window');
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

  const handleFocusAndRetry = async () => {
    if (forwardTarget) {
      await ipcClient.focusWindow(forwardTarget);
    }
    setRetryCount((c) => c + 1);
  };

  // Input Forwarding: Calculate normalized (0..1) coordinates inside the video content box
  const getNormalizedCoordinates = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return null;

    const rect = video.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const videoAspect = (video.videoWidth || 16) / (video.videoHeight || 9);
    const containerAspect = rect.width / rect.height;

    let renderW = rect.width;
    let renderH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (containerAspect > videoAspect) {
      renderW = rect.height * videoAspect;
      offsetX = (rect.width - renderW) / 2;
    } else {
      renderH = rect.width / videoAspect;
      offsetY = (rect.height - renderH) / 2;
    }

    const clickX = e.clientX - rect.left - offsetX;
    const clickY = e.clientY - rect.top - offsetY;

    if (clickX < 0 || clickX > renderW || clickY < 0 || clickY > renderH) {
      return null;
    }

    return {
      normX: Math.max(0, Math.min(1, clickX / renderW)),
      normY: Math.max(0, Math.min(1, clickY / renderH)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!forwardTarget) return;
    const coords = getNormalizedCoordinates(e);
    if (!coords) return;

    containerRef.current?.focus();
    ipcClient.forwardInput(forwardTarget, {
      type: e.button === 2 ? 'rightClick' : 'click',
      normX: coords.normX,
      normY: coords.normY,
    });
  };

  const handleMouseUp = (_e: React.MouseEvent<HTMLDivElement>) => {
    // Focus source window on mouse release
    if (forwardTarget) {
      ipcClient.focusWindow(forwardTarget).catch(() => { });
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!forwardTarget) return;
    const coords = getNormalizedCoordinates(e);
    if (!coords) return;

    ipcClient.forwardInput(forwardTarget, {
      type: 'doubleClick',
      normX: coords.normX,
      normY: coords.normY,
    });
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!forwardTarget) return;
    const coords = getNormalizedCoordinates(e);
    if (!coords) return;

    ipcClient.forwardInput(forwardTarget, {
      type: 'rightClick',
      normX: coords.normX,
      normY: coords.normY,
    });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!forwardTarget) return;
    ipcClient.forwardInput(forwardTarget, {
      type: 'scroll',
      deltaX: Math.round(e.deltaX),
      deltaY: Math.round(e.deltaY),
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 || !forwardTarget) return;
    const now = Date.now();
    if (now - lastMoveTimeRef.current < 45) return; // ~22fps throttle for drag
    lastMoveTimeRef.current = now;

    const coords = getNormalizedCoordinates(e);
    if (!coords) return;

    ipcClient.forwardInput(forwardTarget, {
      type: 'move',
      normX: coords.normX,
      normY: coords.normY,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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

  if ((!sourceId && !targetHwnd) || !isElectron) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-700 p-4 select-none">
        <div className="p-3 rounded-full bg-blue-500/10 text-[#0067C0] mb-2">
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
      className="w-full h-full bg-slate-900 relative flex items-center justify-center overflow-hidden outline-none cursor-default select-none"
      title="Click, scroll with mouse wheel, or type on keyboard to interact"
    >
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

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center text-slate-600 z-20 select-none">
          <RefreshCw size={20} className="animate-spin mb-2 text-[#0067C0]" />
          <span className="text-xs font-medium">Connecting Extended Monitor...</span>
        </div>
      )}

      {/* Error / Closed Overlay */}
      {error && (
        <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center p-5 text-center select-none text-slate-800 z-30">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2.5">
            <AlertCircle size={22} />
          </div>
          <span className="text-xs font-semibold text-slate-900">
            {error.includes('closed') ? 'Application Window Closed or Minimized' : error}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
            {error.includes('closed')
              ? 'The application window was minimized or closed. Click below to bring it back to your screen.'
              : 'Click below to focus and restore the application window.'}
          </span>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleFocusAndRetry}
              className="px-3.5 py-1.5 bg-[#0067C0] text-white text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:bg-[#005FB8]"
            >
              <ExternalLink size={11} /> Focus & Restore
            </button>
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md shadow-2xs inline-flex items-center gap-1.5 transition-all cursor-pointer hover:bg-slate-50"
            >
              <RotateCcw size={11} /> Retry
            </button>
          </div>
        </div>
      )}

      {/* Paused Overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-20">
          <span className="text-xs font-medium text-slate-800 px-3 py-1 rounded-md bg-white shadow-md border border-slate-200">
            Monitor Paused
          </span>
        </div>
      )}
    </div>
  );
};
