import React, { useState, useCallback, useEffect, useRef } from 'react';
import { audioPlayer, VoiceSettings } from '@/lib/elevenlabs';
import { getPageContent, PageMetrics } from '@/lib/readerUtils';
import { getSetting } from '@/lib/tauri';

interface UseTTSOptions {
  getDoc: () => Document | null;
  getPageMetrics: () => PageMetrics;
  currentPage: number;
  onPageTurnNeeded?: () => void;
}

const INITIAL_PROGRESS = { currentTime: 0, duration: 0, isBuffering: false };

export function useTTS({ getDoc, getPageMetrics, currentPage, onPageTurnNeeded }: UseTTSOptions) {
  const state = React.useSyncExternalStore(
    useCallback((callback: () => void) => audioPlayer.subscribe(callback), []),
    () => audioPlayer.getState(),
    () => 'idle' as const
  );

  const progress = React.useSyncExternalStore(
    useCallback((callback: () => void) => audioPlayer.subscribeProgress(callback), []),
    () => audioPlayer.getProgress(),
    () => INITIAL_PROGRESS
  );

  const [autoNext, setAutoNext] = useState(false);
  const [voiceId, setVoiceId] = useState<string | undefined>();
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings | undefined>();

  useEffect(() => {
    Promise.all([
      getSetting('elevenlabs_voice_id'),
      getSetting('elevenlabs_stability'),
      getSetting('elevenlabs_similarity'),
      getSetting('elevenlabs_style'),
      getSetting('elevenlabs_speaker_boost'),
      getSetting('tts_playback_speed'),
      getSetting('tts_volume'),
    ]).then(([id, stability, similarity, style, boost, speed, volume]) => {
      if (id) setVoiceId(id);
      if (stability) {
        setVoiceSettings({
          stability: parseFloat(stability) || 0.5,
          similarity_boost: parseFloat(similarity ?? "0.75") || 0.75,
          style: parseFloat(style ?? "0") || 0,
          use_speaker_boost: boost === "true"
        });
      }

      // Initialize player with persisted speed/volume
      if (speed) {
        audioPlayer.setPlaybackRate(parseFloat(speed));
      }
      if (volume) {
        audioPlayer.setVolume(parseFloat(volume));
      }
    });
  }, []);

  // Track state transitions for auto-advance
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (state === 'idle' && prevStateRef.current === 'playing') {
      if (autoNext) {
        onPageTurnNeeded?.();
      }
    }
    prevStateRef.current = state;
  }, [state, autoNext, onPageTurnNeeded]);

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
      await audioPlayer.play(text, voiceId, voiceSettings);
    }
  }, [currentPage, getPageText, voiceId, voiceSettings]);

  const playText = useCallback(async (text: string) => {
    if (text) {
      setAutoNext(false); // One-off playback should not auto-advance
      await audioPlayer.play(text, voiceId, voiceSettings);
    }
  }, [voiceId, voiceSettings]);

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

  const setPlaybackRate = useCallback(async (rate: number) => {
    audioPlayer.setPlaybackRate(rate);
    const { setSetting } = await import('@/lib/tauri');
    await setSetting({ key: 'tts_playback_speed', value: rate.toString() });
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    audioPlayer.setVolume(volume);
    const { setSetting } = await import('@/lib/tauri');
    await setSetting({ key: 'tts_volume', value: volume.toString() });
  }, []);

  const seek = useCallback((position: number) => {
    audioPlayer.seek(position);
  }, []);

  const changeVoice = useCallback(async (newVoiceId: string) => {
    console.log(`[useTTS] changeVoice called with: ${newVoiceId}`);
    setVoiceId(newVoiceId);
    const { setSetting } = await import('@/lib/tauri');
    await setSetting({ key: 'elevenlabs_voice_id', value: newVoiceId });
  }, []);

  return {
    state,
    progress,
    playCurrentPage,
    playText,
    pause,
    resume,
    stop,
    getPageText,
    autoNext,
    setPlaybackRate,
    setVolume,
    seek,
    voiceId,
    changeVoice,
  };
}
