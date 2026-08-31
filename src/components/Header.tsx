import React, { useState } from 'react';
import logo from '../assets/logo.png';
import { Sparkles, RefreshCw, X, CheckCircle2, Zap } from 'lucide-react';

const CURRENT_VERSION = 'v1.3.0';

const CHANGELOG = [
  'Live Updates ativo: Atualizações pelo botão sem precisar reinstalar o APK',
  'Nomenclatura de engenharia: AF (Água Fria), AQ (Água Quente) e Gás',
  'Combinações completas de utilidades (AF, AQ, Gás, AF e AQ, AF e Gás, etc.)',
  'Novo fluxo especializado para Troca de Equipamentos (Medidor, Transmissor ou Completa)',
  'Campos e fotos independentes para hidrômetros de AF e AQ',
  'Visualizador de fotos em tela cheia com zoom',
  'Laudo em PDF com fotos 3x maiores e tabelas separadas por medidor'
];

const Header: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleUpdate = () => {
    setUpdating(true);
    setTimeout(async () => {
      try {
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map(name => caches.delete(name)));
        }
        window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
      } catch {
        window.location.reload();
      }
    }, 600);
  };

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
        
        {/* Botão Intuitivo de Atualizações & Novidades */}
        <button 
          onClick={() => setShowModal(true)}
          style={{
            backgroundColor: 'rgba(45, 138, 60, 0.1)',
            color: 'var(--primary)',
            border: '1px solid rgba(45, 138, 60, 0.25)',
            padding: '6px 12px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            fontWeight: '600',
            cursor: 'pointer',
            margin: 0,
            width: 'auto'
          }}
          title="Ver Novidades e Atualizar"
        >
          <Sparkles size={14} color="var(--primary)" />
          <span>Atualizações</span>
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
              maxWidth: '420px',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              border: '1px solid var(--border)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{
                backgroundColor: 'rgba(45, 138, 60, 0.15)',
                color: 'var(--primary)',
                padding: '8px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Zap size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>
                  Central de Atualizações
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                  Versão Atual: {CURRENT_VERSION}
                </span>
              </div>
            </div>

            {/* Lista de Novidades */}
            <div style={{
              backgroundColor: 'var(--background)',
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              marginBottom: '1.25rem'
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Novidades & Melhorias:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none' }}>
                {CHANGELOG.map((item, idx) => (
                  <li key={idx} style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '8px', 
                    fontSize: '0.8rem', 
                    marginBottom: '8px',
                    lineHeight: '1.3',
                    color: 'var(--text)'
                  }}>
                    <CheckCircle2 size={15} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
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
                  backgroundColor: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: '600',
                  padding: '12px'
                }}
              >
                <RefreshCw size={18} className={updating ? 'spin' : ''} />
                <span>{updating ? 'Atualizando Aplicativo...' : 'Atualizar Aplicativo Agora'}</span>
              </button>

              {!updating && (
                <button 
                  onClick={() => setShowModal(false)}
                  className="secondary"
                  style={{ margin: 0, border: 'none', background: 'transparent', color: 'var(--text-muted)' }}
                >
                  Continuar usando
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
