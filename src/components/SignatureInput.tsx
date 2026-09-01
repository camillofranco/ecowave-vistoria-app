import React, { useRef, useEffect } from 'react';
import SignaturePad from 'signature_pad';
import { RotateCcw, PenTool } from 'lucide-react';

interface SignatureInputProps {
  label?: string;
  helperText?: string;
  onSave: (dataUrl: string) => void;
  initialValue?: string;
}

const SignatureInput: React.FC<SignatureInputProps> = ({ 
  label = 'Assinatura', 
  helperText, 
  onSave, 
  initialValue 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      signaturePadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: '#ffffff',
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
    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
        <PenTool size={16} color="var(--primary)" />
        <span>{label}</span>
      </label>
      {helperText && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '-0.2rem 0 0.5rem 0' }}>
          {helperText}
        </p>
      )}
      <div style={{ 
        position: 'relative', 
        border: '2px dashed var(--border)', 
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        backgroundColor: '#ffffff'
      }}>
        <canvas 
          ref={canvasRef} 
          style={{ width: '100%', height: '170px', cursor: 'crosshair', display: 'block' }} 
        />
        <button 
          onClick={clear}
          className="secondary"
          style={{ 
            position: 'absolute', 
            bottom: '8px', 
            right: '8px', 
            width: 'auto',
            padding: '0.4rem 0.8rem',
            fontSize: '0.75rem',
            backgroundColor: 'rgba(241, 245, 249, 0.9)',
            border: '1px solid #cbd5e1',
            color: '#334155'
          }}
        >
          <RotateCcw size={13} /> Limpar
        </button>
      </div>
    </div>
  );
};

export default SignatureInput;
