import { useState, useCallback, useEffect } from 'react';
import { audioPlayer, PlaybackState } from '@/lib/elevenlabs';
import { getPageContent, PageMetrics } from '@/lib/readerUtils';

interface UseTTSOptions {
  getDoc: () => Document | null;
  getPageMetrics: () => PageMetrics;
  currentPage: number;
  onPageTurnNeeded?: () => void;
}

export function useTTS({ getDoc, getPageMetrics, currentPage, onPageTurnNeeded }: UseTTSOptions) {
  const [state, setState] = useState<PlaybackState>('idle');

  useEffect(() => {
    audioPlayer.subscribe((newState) => {
      setState(newState);
      if (newState === 'idle' && state === 'playing') {
        // Audio finished naturally
        onPageTurnNeeded?.();
      }
    });
  }, [state, onPageTurnNeeded]);

  const getPageText = useCallback((pageIndex: number) => {
    const doc = getDoc();
    if (!doc) return "";
    
    const metrics = getPageMetrics();
    const content = getPageContent(doc, pageIndex, metrics);
    return content.text;
  }, [getDoc, getPageMetrics]);

  const playCurrentPage = useCallback(async () => {
    const text = getPageText(currentPage);
    if (text) {
      await audioPlayer.play(text);
    }
  }, [currentPage, getPageText]);

  const pause = useCallback(() => {
    audioPlayer.pause();
  }, []);

  const resume = useCallback(() => {
    audioPlayer.resume();
  }, []);

  const stop = useCallback(() => {
    audioPlayer.stop();
  }, []);

  return {
    state,
    playCurrentPage,
    pause,
    resume,
    stop,
    getPageText,
  };
}
