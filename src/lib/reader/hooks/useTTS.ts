import { useState, useCallback, useEffect } from 'react';
import { audioPlayer, PlaybackState } from '@/lib/elevenlabs';
import { getPageContent, PageMetrics } from '@/lib/readerUtils';
import { getSetting } from '@/lib/tauri';

interface UseTTSOptions {
  getDoc: () => Document | null;
  getPageMetrics: () => PageMetrics;
  currentPage: number;
  onPageTurnNeeded?: () => void;
}

export function useTTS({ getDoc, getPageMetrics, currentPage, onPageTurnNeeded }: UseTTSOptions) {
  const [state, setState] = useState<PlaybackState>('idle');
  const [autoNext, setAutoNext] = useState(false);
  const [voiceId, setVoiceId] = useState<string | undefined>();

  useEffect(() => {
    getSetting('elevenlabs_voice_id').then(id => {
      if (id) setVoiceId(id);
    });
  }, []);

  useEffect(() => {
    return audioPlayer.subscribe((newState) => {
      setState((prevState) => {
        if (newState === 'idle' && prevState === 'playing') {
            // Use a timeout or next tick to avoid state update loops during subscribe
            setTimeout(() => {
                if (autoNext) {
                  onPageTurnNeeded?.();
                }
            }, 0);
        }
        return newState;
      });
    });
  }, [autoNext, onPageTurnNeeded]);

  // When currentPage changes, if autoNext is true, start playing
  useEffect(() => {
    if (autoNext && state === 'idle') {
      playCurrentPage();
    }
  }, [currentPage, autoNext]);

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
      setAutoNext(true);
      await audioPlayer.play(text, voiceId);
    }
  }, [currentPage, getPageText, voiceId]);

  const playText = useCallback(async (text: string) => {
    if (text) {
      setAutoNext(false); // One-off playback should not auto-advance
      await audioPlayer.play(text, voiceId);
    }
  }, [voiceId]);

  const pause = useCallback(() => {
    audioPlayer.pause();
  }, []);

  const resume = useCallback(() => {
    audioPlayer.resume();
  }, []);

  const stop = useCallback(() => {
    setAutoNext(false);
    audioPlayer.stop();
  }, []);

  return {
    state,
    playCurrentPage,
    playText,
    pause,
    resume,
    stop,
    getPageText,
    autoNext,
  };
}
