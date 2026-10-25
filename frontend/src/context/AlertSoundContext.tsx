import React, { createContext, useContext, useState, useEffect } from 'react';

interface AlertSoundContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playAlertChime: () => void;
  playSosSiren: () => void;
}

const AlertSoundContext = createContext<AlertSoundContextType | undefined>(undefined);

export const AlertSoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('lifelink_audio_muted') === 'true';
  });

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('lifelink_audio_muted', String(next));
      return next;
    });
  };

  const playTone = (frequency: number, durationMs: number, type: OscillatorType = 'sine') => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (durationMs / 1000));

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + (durationMs / 1000));
    } catch {
      // Browser autoplay policies might block audio before user gesture
    }
  };

  const playAlertChime = () => {
    if (isMuted) return;
    playTone(880, 200); // A5
    setTimeout(() => playTone(659.25, 300), 220); // E5
  };

  const playSosSiren = () => {
    if (isMuted) return;
    playTone(960, 150, 'triangle');
    setTimeout(() => playTone(720, 150, 'triangle'), 160);
    setTimeout(() => playTone(960, 200, 'triangle'), 320);
  };

  return (
    <AlertSoundContext.Provider value={{ isMuted, toggleMute, playAlertChime, playSosSiren }}>
      {children}
    </AlertSoundContext.Provider>
  );
};

export const useAlertSound = () => {
  const context = useContext(AlertSoundContext);
  if (!context) throw new Error('useAlertSound must be used within an AlertSoundProvider');
  return context;
};
