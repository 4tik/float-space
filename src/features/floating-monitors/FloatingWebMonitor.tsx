import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCw, ExternalLink, Globe, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FloatingWebMonitorProps {
  url?: string;
  title?: string;
}

export const FloatingWebMonitor: React.FC<FloatingWebMonitorProps> = ({ url, title }) => {
  const webviewRef = useRef<any>(null);
  const [currentUrl, setCurrentUrl] = useState(url || 'https://google.com');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState(title || '');

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleStartLoading = () => setIsLoading(true);
    const handleStopLoading = () => {
      setIsLoading(false);
      try {
        setCanGoBack(webview.canGoBack());
        setCanGoForward(webview.canGoForward());
        const u = webview.getURL();
        if (u) setCurrentUrl(u);
        const t = webview.getTitle();
        if (t) setPageTitle(t);
      } catch {}
    };

    const handleDidNavigate = (e: any) => {
      if (e.url) setCurrentUrl(e.url);
    };

    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-navigate-in-page', handleDidNavigate);

    return () => {
      try {
        webview.removeEventListener('did-start-loading', handleStartLoading);
        webview.removeEventListener('did-stop-loading', handleStopLoading);
        webview.removeEventListener('did-navigate', handleDidNavigate);
        webview.removeEventListener('did-navigate-in-page', handleDidNavigate);
      } catch {}
    };
  }, []);

  const handleBack = () => {
    try {
      if (webviewRef.current?.canGoBack()) webviewRef.current.goBack();
    } catch {}
  };

  const handleForward = () => {
    try {
      if (webviewRef.current?.canGoForward()) webviewRef.current.goForward();
    } catch {}
  };

  const handleReload = () => {
    try {
      webviewRef.current?.reload();
    } catch {}
  };

  const handleOpenExternal = () => {
    if (currentUrl) {
      window.open(currentUrl, '_blank');
    }
  };

  let hostname = '';
  try {
    hostname = new URL(currentUrl).hostname;
  } catch {
    hostname = currentUrl;
  }

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-[#FAF9F6] overflow-hidden select-none">
      {/* Mini Web Navigation Bar */}
      <div className="h-7 w-full bg-[#F5F4F0]/90 border-b border-black/[0.08] px-2 flex items-center justify-between text-xs text-stone-600 gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            className="p-1 rounded-[4px] hover:bg-black/[0.05] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Go back"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            className="p-1 rounded-[4px] hover:bg-black/[0.05] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Go forward"
          >
            <ChevronRight size={13} />
          </button>
          <button
            onClick={handleReload}
            className="p-1 rounded-[4px] hover:bg-black/[0.05] transition-colors cursor-pointer"
            title="Reload website"
          >
            <RotateCw size={11} className={cn(isLoading && 'animate-spin text-amber-600')} />
          </button>
        </div>

        {/* URL Pill */}
        <div
          onClick={handleOpenExternal}
          className="flex-1 max-w-[260px] h-5 bg-white border border-black/[0.08] rounded-[5px] px-2 flex items-center gap-1.5 text-[10px] text-stone-700 cursor-pointer hover:border-black/[0.16] shadow-2xs transition-colors truncate"
          title={`Click to open ${currentUrl} in your default browser`}
        >
          <Lock size={9} className="text-emerald-600 shrink-0" />
          <span className="truncate font-mono">{hostname}</span>
        </div>

        <button
          onClick={handleOpenExternal}
          className="p-1 text-stone-400 hover:text-stone-700 transition-colors rounded-[4px] hover:bg-black/[0.05] cursor-pointer"
          title="Open in external browser"
        >
          <ExternalLink size={11} />
        </button>
      </div>

      {/* Electron Webview for secure sandboxed website rendering */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-white">
        {React.createElement('webview', {
          ref: webviewRef,
          src: currentUrl,
          partition: 'persist:float-web',
          allowpopups: 'true',
          className: 'w-full h-full border-none',
        })}
      </div>
    </div>
  );
};
