import React from 'react';
import logo from '../assets/logo.png';
import { RefreshCw } from 'lucide-react';

const Header: React.FC = () => {
  const forceUpdateApp = () => {
    if (window.confirm("Deseja buscar atualizações e recarregar o aplicativo?")) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
            registration.unregister();
          }
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <header style={{ 
      backgroundColor: '#ffffff',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '0.8rem 1.5rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      margin: '-1rem -1rem 1.5rem -1rem', // Compensa o padding do container pai
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Espaçador invisível na esquerda para centralizar perfeitamente a logo */}
      <div style={{ width: '32px' }}></div> 
      
      <img 
        src={logo} 
        alt="EcoWave Logo" 
        style={{ 
          height: '42px', 
          width: 'auto',
          display: 'block'
        }} 
      />
      
      <button 
        onClick={forceUpdateApp}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--secondary)',
          padding: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          transition: 'background-color 0.2s',
          margin: 0
        }}
        title="Forçar Atualização"
      >
        <RefreshCw size={20} />
      </button>
    </header>
  );
};

export default Header;
