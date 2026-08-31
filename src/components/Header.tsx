import React, { useState, useEffect } from 'react';
import logo from '../assets/logo.png';
import { Sparkles, RefreshCw, X, CheckCircle2, Zap, AlertCircle } from 'lucide-react';

const CURRENT_LOCAL_VERSION = '1.3.0';

interface RemoteVersionData {
  version: string;
  releaseDate: string;
  title: string;
  changelog: string[];
}

const Header: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [remoteData, setRemoteData] = useState<RemoteVersionData | null>(null);
  const [hasNewUpdate, setHasNewUpdate] = useState(false);

  // Verifica automaticamente se existe uma versão mais recente na nuvem ao abrir o app
  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const response = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (response.ok) {
          const data: RemoteVersionData = await response.json();
          setRemoteData(data);

          const installedVersion = localStorage.getItem('ecowave_installed_version') || CURRENT_LOCAL_VERSION;
          
          // Se a versão na nuvem for diferente da instalada localmente, abre o pop-up automaticamente
          if (data.version !== installedVersion) {
            setHasNewUpdate(true);
            setShowModal(true);
          }
        }
      } catch (e) {
        console.log('Verificação offline ou sem internet');
      }
    };

    checkUpdates();
  }, []);

  const handleUpdate = () => {
    setUpdating(true);
    setTimeout(async () => {
      try {
        // Grava a nova versão como instalada
        if (remoteData?.version) {
          localStorage.setItem('ecowave_installed_version', remoteData.version);
        } else {
          localStorage.setItem('ecowave_installed_version', CURRENT_LOCAL_VERSION);
        }

        // Limpa todos os caches de arquivos
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map(name => caches.delete(name)));
        }

        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let reg of registrations) {
            await reg.unregister();
          }
        }

        window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
      } catch {
        window.location.reload();
      }
    }, 600);
  };

  const changelogItems = remoteData?.changelog || [
    'Nomenclatura técnica de engenharia: AF (Água Fria), AQ (Água Quente) e Gás',
    'Combinações completas de utilidades (AF, AQ, Gás, AF e AQ, AF e Gás, etc.)',
    'Novo fluxo especializado para Troca de Equipamentos (Medidor, Transmissor ou Completa)',
    'Campos e fotos independentes para hidrômetros de AF e AQ',
    'Visualizador de fotos em tela cheia com zoom ao tocar na foto',
    'Laudo em PDF com fotos 3x maiores e tabelas separadas por medidor'
  ];

  return (
    <>
      <header style={{ 
        backgroundColor: '#ffffff',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0.6rem 1rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        margin: '-1rem -1rem 1.5rem -1rem',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Logo EcoWave à esquerda */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={logo} 
            alt="EcoWave Logo" 
            style={{ 
              height: '38px', 
              width: 'auto',
              display: 'block'
            }} 
          />
        </div>
        
        {/* Botão Intuitivo de Atualizações & Novidades com indicador visual */}
        <button 
          onClick={() => setShowModal(true)}
          style={{
            backgroundColor: hasNewUpdate ? '#10b981' : 'rgba(45, 138, 60, 0.1)',
            color: hasNewUpdate ? '#ffffff' : 'var(--primary)',
            border: hasNewUpdate ? 'none' : '1px solid rgba(45, 138, 60, 0.25)',
            padding: '6px 12px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            fontWeight: '600',
            cursor: 'pointer',
            margin: 0,
            width: 'auto',
            boxShadow: hasNewUpdate ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none',
            transition: 'all 0.3s ease'
          }}
          title="Ver Novidades e Atualizar"
        >
          <Sparkles size={14} color={hasNewUpdate ? '#ffffff' : 'var(--primary)'} />
          <span>{hasNewUpdate ? 'Nova Versão!' : 'Atualizações'}</span>
        </button>
      </header>

      {/* Pop-up / Modal de Novidades e Atualização */}
      {showModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            boxSizing: 'border-box'
          }}
          onClick={() => !updating && setShowModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '440px',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              border: hasNewUpdate ? '2px solid #10b981' : '1px solid var(--border)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão Fechar no topo */}
            {!updating && (
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  width: 'auto',
                  margin: 0
                }}
              >
                <X size={20} />
              </button>
            )}

            {/* Cabeçalho do Pop-up */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div style={{
                backgroundColor: hasNewUpdate ? 'rgba(16, 185, 129, 0.15)' : 'rgba(45, 138, 60, 0.15)',
                color: hasNewUpdate ? '#10b981' : 'var(--primary)',
                padding: '10px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Zap size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text)' }}>
                  {hasNewUpdate ? '🎉 Nova Atualização Disponível!' : 'Central de Atualizações'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: hasNewUpdate ? '#10b981' : 'var(--primary)', fontWeight: 'bold' }}>
                  Versão {remoteData?.version || CURRENT_LOCAL_VERSION}
                </span>
              </div>
            </div>

            {/* Status do App */}
            {hasNewUpdate ? (
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.75rem',
                borderRadius: '10px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#10b981',
                fontSize: '0.8rem'
              }}>
                <AlertCircle size={16} />
                <span>Uma versão mais recente com melhorias está pronta para uso.</span>
              </div>
            ) : (
              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                padding: '0.75rem',
                borderRadius: '10px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#60a5fa',
                fontSize: '0.8rem'
              }}>
                <CheckCircle2 size={16} />
                <span>Seu aplicativo está na versão mais recente disponível.</span>
              </div>
            )}

            {/* Lista de Novidades */}
            <div style={{
              backgroundColor: 'var(--background)',
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              marginBottom: '1.25rem',
              maxHeight: '220px',
              overflowY: 'auto'
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Novidades Desta Versão:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none' }}>
                {changelogItems.map((item, idx) => (
                  <li key={idx} style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '8px', 
                    fontSize: '0.8rem', 
                    marginBottom: '8px',
                    lineHeight: '1.3',
                    color: 'var(--text)'
                  }}>
                    <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                onClick={handleUpdate}
                disabled={updating}
                style={{
                  backgroundColor: hasNewUpdate ? '#10b981' : 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: '600',
                  padding: '12px',
                  fontSize: '0.95rem'
                }}
              >
                <RefreshCw size={18} className={updating ? 'spin' : ''} />
                <span>{updating ? 'Atualizando Aplicativo...' : hasNewUpdate ? '🚀 Aplicar Nova Atualização Agora' : 'Recarregar Aplicativo'}</span>
              </button>

              {!updating && (
                <button 
                  onClick={() => setShowModal(false)}
                  className="secondary"
                  style={{ margin: 0, border: 'none', background: 'transparent', color: 'var(--text-muted)' }}
                >
                  {hasNewUpdate ? 'Atualizar Mais Tarde' : 'Fechar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
