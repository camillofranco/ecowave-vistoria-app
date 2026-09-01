import React, { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Camera as CameraIcon, RefreshCw, X } from 'lucide-react';

interface CameraInputProps {
  label: string;
  onPhotoTaken: (base64: string) => void;
  initialValue?: string;
}

const CameraInput: React.FC<CameraInputProps> = ({ label, onPhotoTaken, initialValue }) => {
  const [preview, setPreview] = useState<string | undefined>(initialValue);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const takePhoto = async () => {
    try {
      setLoading(true);
      const image = await Camera.getPhoto({
        quality: 75,
        width: 1280, // Limita largura máxima (reduz tamanho do arquivo e acelera o app)
        correctOrientation: true,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
        promptLabelHeader: 'Ecowave Vistoria',
        promptLabelPhoto: 'Escolher da Galeria',
        promptLabelPicture: 'Tirar Foto'
      });

      if (image.dataUrl) {
        setPreview(image.dataUrl);
        onPhotoTaken(image.dataUrl);
      }
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(undefined);
    onPhotoTaken('');
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <div 
        className="photo-container" 
        onClick={takePhoto}
        style={{ cursor: 'pointer', border: preview ? '2px solid var(--primary)' : '2px dashed var(--border)' }}
      >
        {preview ? (
          <>
            <img 
              src={preview} 
              alt="Preview" 
              className="photo-preview" 
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
            />
            <div style={{ 
              position: 'absolute', 
              top: '8px', 
              right: '8px', 
              display: 'flex', 
              gap: '8px',
              zIndex: 10
            }}>
              <button 
                onClick={(e) => { e.stopPropagation(); takePhoto(); }}
                className="secondary"
                style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}
              >
                <RefreshCw size={18} />
              </button>
              <button 
                onClick={clearPhoto}
                className="secondary"
                style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%', backgroundColor: 'var(--error)' }}
              >
                <X size={18} color="white" />
              </button>
            </div>
          </>
        ) : (
          <div className="photo-placeholder">
            <CameraIcon size={32} />
            <span>{loading ? 'Abrindo câmera...' : 'Toque para tirar foto'}</span>
          </div>
        )}
      </div>

      {showModal && preview && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.95)', // Slate 900 escuro com opacidade
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={() => setShowModal(false)}
        >
          <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
            <button 
              className="secondary" 
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(255,255,255,0.15)', 
                color: 'white', 
                border: 'none', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
              onClick={() => setShowModal(false)}
            >
              <X size={24} />
            </button>
          </div>
          <img 
            src={preview} 
            alt="Visualização Ampliada" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '80vh', 
              objectFit: 'contain',
              borderRadius: '8px',
              border: '2px solid rgba(255,255,255,0.1)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }} 
          />
          <div style={{ 
            marginTop: '20px', 
            color: '#f8fafc', 
            fontSize: '1rem', 
            textAlign: 'center', 
            fontWeight: '600',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '8px 16px',
            borderRadius: '20px'
          }}>
            {label}
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraInput;
