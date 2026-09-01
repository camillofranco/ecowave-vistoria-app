import React, { useState, useEffect, useCallback } from 'react';
import logo from '../assets/logo.png';
import { Sparkles, RefreshCw, X, CheckCircle2, Zap, AlertCircle, Sun, Moon, Laptop } from 'lucide-react';

const CURRENT_LOCAL_VERSION = '1.7.0';

type ThemeMode = 'system' | 'light' | 'dark';

interface RemoteVersionData {
  version: string;
  releaseDate: string;
  title: string;
  changelog: string[];
}

const Header: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [remoteData, setRemoteData] = useState<RemoteVersionData | null>(null);
  const [hasNewUpdate, setHasNewUpdate] = useState(false);

  // Gerenciamento de Tema (Sistema, Claro, Escuro)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('ecowave_theme') as ThemeMode) || 'system';
  });

  useEffect(() => {
    const applyTheme = () => {
      localStorage.setItem('ecowave_theme', theme);
      if (theme === 'light') {
        document.body.className = 'theme-light';
      } else if (theme === 'dark') {
        document.body.className = 'theme-dark';
      } else {
        const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.className = isSystemDark ? 'theme-dark' : 'theme-light';
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        document.body.className = e.matches ? 'theme-dark' : 'theme-light';
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const cycleTheme = () => {
    setTheme(current => {
      if (current === 'system') return 'light';
      if (current === 'light') return 'dark';
      return 'system';
    });
  };

  const checkUpdates = useCallback(async (manual = false) => {
    setChecking(true);
    try {
      const response = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) {
        const data: RemoteVersionData = await response.json();
        setRemoteData(data);

        // Compara a versão remota com a instalada
        const savedVersion = localStorage.getItem('ecowave_installed_version') || CURRENT_LOCAL_VERSION;
        const isNewer = data.version !== savedVersion && data.version !== CURRENT_LOCAL_VERSION;
        setHasNewUpdate(isNewer);

        // Abre automaticamente se for uma nova versão não instalada
        if (isNewer && !manual) {
          setShowModal(true);
        }
      }
    } catch (e) {
      console.log('Verificação offline');
    } finally {
      setChecking(false);
    }
  }, []);

  // Checagem automática ao abrir o app
  useEffect(() => {
    checkUpdates(false);
  }, [checkUpdates]);

  const handleOpenModal = () => {
    checkUpdates(true);
    setShowModal(true);
  };

  const handleApplyUpdate = async () => {
    setUpdating(true);
    try {
      if (remoteData?.version) {
        localStorage.setItem('ecowave_installed_version', remoteData.version);
      } else {
        localStorage.setItem('ecowave_installed_version', CURRENT_LOCAL_VERSION);
      }

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
    } catch (e) {
      console.log('Erro ao limpar cache', e);
    }

    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const changelogItems = remoteData?.changelog || [
    'Seletor de Tema: escolha entre Modo Claro, Escuro ou Automático do Sistema',
    'Transições visuais suaves entre os modos de cor',
    'Atualização com 1 clique sem bugs ou oscilação de tela',
    'Nomenclatura técnica de engenharia: AF (Água Fria), AQ (Água Quente) e Gás',
    'Combinações completas de utilidades (AF, AQ, Gás, AF e AQ, AF e Gás, etc.)',
    'Novo fluxo especializado para Troca de Equipamentos (Medidor, Transmissor ou Completa)'
  ];

  return (
    <>
      <header style={{ 
        backgroundColor: 'var(--header-bg)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0.6rem 1rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        margin: '-1rem -1rem 1.5rem -1rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'background-color 0.25s ease'
      }}>
        {/* Logo EcoWave */}
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
        
        {/* Controles no Topo Direito: Tema + Atualizações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Botão Seletor de Tema */}
          <button
            onClick={cycleTheme}
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              padding: '6px 10px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: '500',
              cursor: 'pointer',
              margin: 0,
              width: 'auto',
              transition: 'all 0.2s ease'
            }}
            title={`Tema: ${theme === 'system' ? 'Automático (Sistema)' : theme === 'light' ? 'Claro' : 'Escuro'}`}
          >
            {theme === 'system' && <Laptop size={14} color="var(--primary)" />}
            {theme === 'light' && <Sun size={14} color="#f59e0b" />}
            {theme === 'dark' && <Moon size={14} color="#60a5fa" />}
            <span>{theme === 'system' ? 'Auto' : theme === 'light' ? 'Claro' : 'Escuro'}</span>
          </button>

          {/* Botão de Atualizações com status */}
          <button 
            onClick={handleOpenModal}
            className={hasNewUpdate ? 'update-badge-glow' : ''}
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
              transition: 'all 0.3s ease'
            }}
            title="Verificar Atualizações"
          >
            <Sparkles size={14} color={hasNewUpdate ? '#ffffff' : 'var(--primary)'} />
            <span>{hasNewUpdate ? 'Nova Versão!' : `v${CURRENT_LOCAL_VERSION}`}</span>
          </button>
        </div>
      </header>

      {/* Pop-up / Modal */}
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
            {/* Fechar */}
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

            {/* Cabeçalho */}
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
                  {hasNewUpdate ? `Nova Versão: v${remoteData?.version}` : `Versão Atual: v${CURRENT_LOCAL_VERSION}`}
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
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>Uma versão mais recente com o novo Seletor de Temas está pronta!</span>
              </div>
            ) : (
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.75rem',
                borderRadius: '10px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#10b981',
                fontSize: '0.85rem'
              }}>
                <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block' }}>Aplicativo 100% Atualizado!</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Você já está usando a versão mais recente (v{CURRENT_LOCAL_VERSION}).</span>
                </div>
              </div>
            )}

            {/* Lista de Novidades */}
            <div style={{
              backgroundColor: 'var(--background)',
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              marginBottom: '1.25rem',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {hasNewUpdate ? 'Novidades Desta Nova Versão:' : 'Melhorias Desta Versão:'}
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

            {/* Ações Inteligentes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {hasNewUpdate ? (
                <>
                  <button 
                    onClick={handleApplyUpdate}
                    disabled={updating}
                    style={{
                      backgroundColor: '#10b981',
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
                    <span>{updating ? 'Instalando Atualização...' : '🚀 Instalar Nova Versão Agora'}</span>
                  </button>

                  {!updating && (
                    <button 
                      onClick={() => setShowModal(false)}
                      className="secondary"
                      style={{ margin: 0, border: 'none', background: 'transparent', color: 'var(--text-muted)' }}
                    >
                      Lembrar Mais Tarde
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setShowModal(false)}
                    style={{
                      backgroundColor: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontWeight: '600',
                      padding: '12px',
                      fontSize: '0.95rem'
                    }}
                  >
                    <CheckCircle2 size={18} />
                    <span>Entendido, Continuar</span>
                  </button>

                  <button 
                    onClick={handleApplyUpdate}
                    disabled={updating || checking}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      padding: '6px',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <RefreshCw size={12} className={updating || checking ? 'spin' : ''} />
                    <span>Forçar Verificação na Nuvem</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
