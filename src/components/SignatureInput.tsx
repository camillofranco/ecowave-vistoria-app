import React, { useRef, useEffect } from 'react';
import SignaturePad from 'signature_pad';
import { RotateCcw } from 'lucide-react';

interface SignatureInputProps {
  onSave: (dataUrl: string) => void;
  initialValue?: string;
}

const SignatureInput: React.FC<SignatureInputProps> = ({ onSave, initialValue }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      signaturePadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: '#f8fafc',
        penColor: '#0f172a'
      });

      if (initialValue) {
        signaturePadRef.current.fromDataURL(initialValue);
      }

      const resizeCanvas = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = canvas.offsetWidth * ratio;
          canvas.height = canvas.offsetHeight * ratio;
          canvas.getContext('2d')?.scale(ratio, ratio);
          signaturePadRef.current?.clear();
          if (initialValue) signaturePadRef.current?.fromDataURL(initialValue);
        }
      };

      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();

      signaturePadRef.current.addEventListener('endStroke', () => {
        onSave(signaturePadRef.current?.toDataURL() || '');
      });

      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, [initialValue]);

  const clear = () => {
    signaturePadRef.current?.clear();
    onSave('');
  };

  return (
    <div className="form-group">
      <label>Assinatura do Responsável / Técnico</label>
      <div style={{ 
        position: 'relative', 
        border: '2px solid var(--border)', 
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        backgroundColor: '#f8fafc'
      }}>
        <canvas 
          ref={canvasRef} 
          style={{ width: '100%', height: '200px', cursor: 'crosshair' }} 
        />
        <button 
          onClick={clear}
          className="secondary"
          style={{ 
            position: 'absolute', 
            bottom: '10px', 
            right: '10px', 
            width: 'auto',
            padding: '0.5rem',
            fontSize: '0.8rem'
          }}
        >
          <RotateCcw size={14} /> Corrigir Assinatura
        </button>
      </div>
    </div>
  );
};

export default SignatureInput;
