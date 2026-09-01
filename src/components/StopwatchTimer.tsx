import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';

interface StopwatchTimerProps {
  initialSeconds?: number;
  onComplete?: () => void;
}

const StopwatchTimer: React.FC<StopwatchTimerProps> = ({ 
  initialSeconds = 10,
  onComplete 
}) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<any>(null);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz (Lá)
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);

      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {
      console.log('Áudio não disponível');
    }
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            playBeep();
            if (onComplete) onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, onComplete]);

  const handleStart = () => {
    if (timeLeft === 0) setTimeLeft(initialSeconds);
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(initialSeconds);
  };

  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '0.75rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          backgroundColor: isRunning ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
          color: isRunning ? 'var(--success)' : 'var(--primary)',
          padding: '8px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Timer size={20} />
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
            CRONÔMETRO DE COLETA (10s)
          </div>
          <div style={{ 
            fontSize: '1.25rem', 
            fontWeight: 'bold', 
            color: timeLeft === 0 ? 'var(--success)' : isRunning ? 'var(--primary)' : 'var(--text)',
            fontVariantNumeric: 'tabular-nums'
          }}>
            {timeLeft < 10 ? `0${timeLeft}` : timeLeft}s
            {timeLeft === 0 && <span style={{ fontSize: '0.8rem', marginLeft: '6px', color: 'var(--success)' }}>✅ Concluído!</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {!isRunning ? (
          <button
            type="button"
            onClick={handleStart}
            style={{
              backgroundColor: timeLeft === 0 ? 'var(--surface-hover)' : 'var(--primary)',
              color: '#ffffff',
              padding: '6px 12px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              margin: 0,
              width: 'auto',
              borderRadius: '20px'
            }}
          >
            <Play size={14} />
            <span>{timeLeft === 0 ? 'Repetir' : 'Iniciar'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePause}
            style={{
              backgroundColor: 'var(--warning)',
              color: '#ffffff',
              padding: '6px 12px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              margin: 0,
              width: 'auto',
              borderRadius: '20px'
            }}
          >
            <Pause size={14} />
            <span>Pausar</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleReset}
          className="secondary"
          style={{
            padding: '6px 8px',
            fontSize: '0.8rem',
            margin: 0,
            width: 'auto',
            borderRadius: '20px'
          }}
          title="Reiniciar"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};

export default StopwatchTimer;
