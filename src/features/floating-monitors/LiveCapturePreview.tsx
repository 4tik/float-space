import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw, VideoOff } from 'lucide-react';
import { isElectron, ipcClient } from '../../services/ipc-client';
import { cn } from '../../utils/cn';

interface LiveCapturePreviewProps {
  sourceId?: string;
  frameRate?: number;
  quality?: 'low' | 'medium' | 'high';
  isPaused?: boolean;
  onEnded?: () => void;
}

export const LiveCapturePreview: React.FC<LiveCapturePreviewProps> = ({
  sourceId,
  frameRate = 30,
  quality = 'medium',
  isPaused = false,
  onEnded,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fallbackImage, setFallbackImage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadFallbackThumbnail() {
      if (!sourceId || !isElectron) return;
      try {
        const windows = await ipcClient.getRunningWindows();
        const match = windows.find((w) => w.sourceId === sourceId || w.id === sourceId);
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

      // Stop previous tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      try {
        if (!isElectron) {
          setLoading(false);
          return;
        }

        const constraints: any = {
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              maxFrameRate: frameRate,
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
          console.warn('WebRTC stream capture error, attempting fallback thumbnail:', err);
          // If we have a fallback thumbnail, don't show fatal error
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
  }, [sourceId, frameRate]);

  // Handle stream pause/resume
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !isPaused;
      });
    }
  }, [isPaused]);

  if (error && !fallbackImage) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 p-4 text-center select-none text-slate-700">
        <AlertCircle size={22} className="text-amber-500 mb-2" />
        <span className="text-xs font-semibold text-slate-800">{error}</span>
        <span className="text-[10px] text-slate-500 mt-1 max-w-xs">
          Make sure the target application is not minimized.
        </span>
      </div>
    );
  }

  if (loading && !fallbackImage) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-600 select-none">
        <RefreshCw size={20} className="animate-spin mb-2 text-primary-500" />
        <span className="text-xs font-medium">Connecting Live Preview...</span>
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
    <div className="w-full h-full bg-slate-100 relative flex items-center justify-center overflow-hidden">
      {/* Fallback image if WebRTC stream is buffering or unavailable */}
      {fallbackImage && (
        <img
          src={fallbackImage}
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      )}

      {/* Primary hardware-accelerated video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onPlaying={() => setIsPlaying(true)}
        className={cn(
          "w-full h-full object-contain pointer-events-none relative z-10 transition-opacity duration-200",
          isPlaying ? "opacity-100" : "opacity-0"
        )}
      />

      {isPaused && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-20">
          <span className="text-xs font-medium text-slate-800 px-2.5 py-1 rounded bg-white shadow-md border border-slate-200">
            Preview Paused
          </span>
        </div>
      )}
    </div>
  );
};
