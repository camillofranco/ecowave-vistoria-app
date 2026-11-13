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
  const onSaveRef = useRef(onSave);
  const renderedValueRef = useRef<string | undefined>(undefined);
  const imageLoadRef = useRef(0);
  const bitmapRef = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  // One pad per mounted canvas. Recreating it for each emitted stroke leaves
  // pointer handlers behind and makes a multi-stroke signature progressively slow.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pad = new SignaturePad(canvas, {
      backgroundColor: '#ffffff',
      penColor: '#0f172a'
    });
    signaturePadRef.current = pad;
    renderedValueRef.current = undefined;

    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = Math.round(canvas.offsetWidth * ratio);
      const height = Math.round(canvas.offsetHeight * ratio);
      if (!width || !height || (canvas.width === width && canvas.height === height)) return;
      // Keep the original bitmap through repeated rotations (no cumulative
      // shrinking). History signatures also have no vector strokes.
      const snapshot = bitmapRef.current;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context?.scale(ratio, ratio);
      pad.clear();
      if (snapshot) {
        const scale = Math.min(width / snapshot.width, height / snapshot.height);
        context?.drawImage(snapshot, 0, 0, snapshot.width * scale / ratio, snapshot.height * scale / ratio);
      }
    };

    const saveStroke = () => {
      // A pending historical image must not overwrite a newer stroke.
      imageLoadRef.current += 1;
      const snapshot = document.createElement('canvas');
      snapshot.width = canvas.width;
      snapshot.height = canvas.height;
      snapshot.getContext('2d')?.drawImage(canvas, 0, 0);
      bitmapRef.current = snapshot;
      const value = pad.toDataURL();
      renderedValueRef.current = value;
      onSaveRef.current(value);
    };
    resizeCanvas();
    pad.addEventListener('endStroke', saveStroke);
    window.addEventListener('resize', resizeCanvas);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resizeCanvas) : null;
    observer?.observe(canvas);
    return () => {
      imageLoadRef.current += 1;
      observer?.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      pad.removeEventListener('endStroke', saveStroke);
      pad.off();
      signaturePadRef.current = null;
    };
  }, []);

  useEffect(() => {
    const pad = signaturePadRef.current;
    const canvas = canvasRef.current;
    if (!pad || !canvas || initialValue === renderedValueRef.current) return;
    renderedValueRef.current = initialValue;
    const request = ++imageLoadRef.current;
    pad.clear();
    bitmapRef.current = null;
    if (!initialValue) return;
    const image = new Image();
    image.onload = () => {
      if (request !== imageLoadRef.current || signaturePadRef.current !== pad) return;
      bitmapRef.current = image;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
      canvas.getContext('2d')?.drawImage(image, 0, 0, image.width * scale / ratio, image.height * scale / ratio);
    };
    image.src = initialValue;
    return () => { imageLoadRef.current += 1; };
  }, [initialValue]);

  const clear = () => {
    imageLoadRef.current += 1;
    signaturePadRef.current?.clear();
    bitmapRef.current = null;
    renderedValueRef.current = '';
    onSaveRef.current('');
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
          style={{ width: '100%', height: '170px', cursor: 'crosshair', display: 'block', touchAction: 'none' }} 
        />
        <button 
          type="button"
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
