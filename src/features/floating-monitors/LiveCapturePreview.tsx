import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw, VideoOff } from 'lucide-react';
import { isElectron } from '../../services/ipc-client';

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

  useEffect(() => {
    let isCancelled = false;

    async function startCapture() {
      if (!sourceId) {
        setLoading(false);
        return;
      }

      setError(null);
      setLoading(true);

      // Stop previous tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      try {
        if (!isElectron) {
          // Fallback in web browser mode
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

        // Listen for track ended (e.g. source window closed)
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            setError('Source application window closed.');
            onEnded?.();
          };
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        setLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Screen capture error:', err);
          setError(err.message || 'Failed to capture application window.');
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
  }, [sourceId, frameRate, quality, onEnded]);

  // Handle pause/resume
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !isPaused;
      });
    }
  }, [isPaused]);

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-4 text-center">
        <AlertCircle size={24} className="text-rose-500 mb-2" />
        <span className="text-xs font-medium text-slate-300">{error}</span>
        <span className="text-[10px] text-slate-500 mt-1">
          The original application window may have been closed or minimized.
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400">
        <RefreshCw size={20} className="animate-spin mb-2 text-primary-500" />
        <span className="text-xs">Connecting Live Stream...</span>
      </div>
    );
  }

  if (!sourceId || !isElectron) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-zinc-950 text-slate-300 p-4 select-none">
        <div className="p-3 rounded-full bg-primary-500/10 text-primary-400 mb-2">
          <VideoOff size={22} />
        </div>
        <div className="text-xs font-semibold">Active Live Monitor Window</div>
        <div className="text-[10px] text-slate-400 mt-1 text-center max-w-[220px]">
          Seamless zero-latency window frame. Select a running app to pipe its live visual feed here.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain pointer-events-none"
      />
      {isPaused && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <span className="text-xs font-medium text-white px-2.5 py-1 rounded bg-black/50 border border-white/10">
            Stream Paused
          </span>
        </div>
      )}
    </div>
  );
};
