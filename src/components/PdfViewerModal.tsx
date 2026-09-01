import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { FileText, Share2, X, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PdfViewerModalProps {
  base64Data: string;
  title: string;
  onClose: () => void;
  onShare?: () => void;
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  base64Data,
  title,
  onClose,
  onShare
}) => {
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});

  useEffect(() => {
    let isMounted = true;

    const renderPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        const binaryString = atob(cleanBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;

        if (!isMounted) return;
        setNumPages(pdf.numPages);

        // Renderiza cada página no canvas
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (!isMounted) break;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: scale * 1.5 }); // Escala 1.5x para nitidez HD

          const canvas = canvasRefs.current[pageNum];
          if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              canvas.style.width = '100%';
              canvas.style.height = 'auto';
              canvas.style.maxWidth = `${viewport.width / 1.5}px`;

              const renderContext = {
                canvasContext: context,
                viewport: viewport
              };
              await page.render(renderContext as any).promise;
            }
          }
        }

        if (isMounted) setLoading(false);
      } catch (err: any) {
        console.error('Erro ao renderizar PDF:', err);
        if (isMounted) {
          setError('Não foi possível carregar a visualização gráfica do laudo.');
          setLoading(false);
        }
      }
    };

    renderPdf();

    return () => {
      isMounted = false;
    };
  }, [base64Data, scale]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.96)',
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      backdropFilter: 'blur(6px)'
    }}>
      {/* Barra de Ferramentas Superior */}
      <div style={{
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0.6rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <FileText size={20} color="var(--primary)" />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>
              VISUALIZAÇÃO DO LAUDO
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Controles de Zoom */}
          <button
            type="button"
            onClick={() => setScale(prev => Math.max(0.8, prev - 0.2))}
            className="secondary"
            style={{ padding: '6px 8px', margin: 0, width: 'auto', borderRadius: '8px' }}
            title="Reduzir Zoom"
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            onClick={() => setScale(prev => Math.min(2.0, prev + 0.2))}
            className="secondary"
            style={{ padding: '6px 8px', margin: 0, width: 'auto', borderRadius: '8px' }}
            title="Aumentar Zoom"
          >
            <ZoomIn size={16} />
          </button>

          {onShare && (
            <button
              type="button"
              onClick={onShare}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                margin: 0,
                width: 'auto',
                backgroundColor: 'var(--primary)',
                borderRadius: '8px'
              }}
            >
              <Share2 size={15} />
              <span>Enviar</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="secondary"
            style={{
              padding: '6px 8px',
              margin: 0,
              width: 'auto',
              borderRadius: '50%'
            }}
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Área de Rolagem das Páginas */}
      <div 
        ref={containerRef}
        style={{
          flex: 1,
          width: '100%',
          overflowY: 'auto',
          overflowX: 'auto',
          padding: '1rem',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem'
        }}
      >
        {loading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            color: '#f8fafc',
            gap: '12px'
          }}>
            <Loader2 size={36} className="spin" color="var(--primary)" />
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Renderizando laudo técnico...</span>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#fca5a5',
            padding: '1.5rem',
            borderRadius: '12px',
            textAlign: 'center',
            margin: 'auto',
            maxWidth: '90%'
          }}>
            <p style={{ margin: '0 0 1rem 0' }}>{error}</p>
            {onShare && (
              <button onClick={onShare} style={{ backgroundColor: 'var(--primary)', width: 'auto' }}>
                Enviar / Baixar PDF Diretamente
              </button>
            )}
          </div>
        )}

        {/* Canvases das Páginas */}
        {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
          <div 
            key={pageNum} 
            style={{
              backgroundColor: '#ffffff',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              maxWidth: '800px'
            }}
          >
            <canvas
              ref={el => { canvasRefs.current[pageNum] = el; }}
              style={{ display: 'block' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PdfViewerModal;
