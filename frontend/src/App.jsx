import { useState } from 'react';
import { Container, Header, Sidebar, Content } from 'rsuite';
import { FaCalendarDays, FaUsers, FaScissors, FaClock, FaChartSimple } from 'react-icons/fa6';
import 'rsuite/dist/rsuite.min.css';

// Importação da sua Logo PNG (Atenção a este detalhe!)
import logoEasyCut from './assets/LogoEasyCut.png';

// Importamos nossas telas
import Agenda from './pages/Agenda';
import Login from './pages/Login';
import Clientes from './pages/Clientes';
import Servicos from './pages/Servicos';
import Horarios from './pages/Horarios';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [activeKey, setActiveKey] = useState('1');
  const token = localStorage.getItem('token');

  if (!token) return <Login />;

  const menuItems = [
    { key: '1', label: 'Agendamentos', icon: <FaCalendarDays /> },
    { key: '2', label: 'Clientes', icon: <FaUsers /> },
    { key: '3', label: 'Serviços', icon: <FaScissors /> },
    { key: '4', label: 'Horários', icon: <FaClock /> },
    { key: '5', label: 'Painel de Controle', icon: <FaChartSimple /> }
  ];

  return (
    <Container style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Roxo */}
      <Header style={{
        background: '#7B2CBF',
        color: 'white',
        padding: '10px 30px',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        height: '60px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Hames Barbearia</div>
            <div style={{ fontSize: '12px', color: '#d8b4fe' }}>Plano Gold</div>
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#ccc'
          }}></div>
          <span style={{ fontSize: '12px', cursor: 'pointer' }}>▼</span>
        </div>
      </Header>

      <Container style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar Escura */}
        <Sidebar style={{ width: 240, background: '#222226', display: 'flex', flexDirection: 'column' }}>
          
          {/* AQUI ESTÁ A SUA LOGO EM PNG */}
          <div style={{ padding: '25px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img 
              src={logoEasyCut} 
              alt="Logo EasyCut" 
              style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain' }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
            {menuItems.map((item) => {
              const isActive = activeKey === item.key;
              return (
                <div
                  key={item.key}
                  onClick={() => setActiveKey(item.key)}
                  style={{
                    padding: '15px 25px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    color: isActive ? '#ffffff' : '#aaaaaa', 
                    backgroundColor: isActive ? '#17171a' : 'transparent',
                    borderLeft: isActive ? '4px solid #7c3aed' : '4px solid transparent',
                    fontSize: '15px',
                    transition: 'all 0.2s ease-in-out',
                    fontWeight: isActive ? 'bold' : 'normal'
                  }}
                >
                  <span style={{ 
                    fontSize: '18px', 
                    color: isActive ? '#7c3aed' : '#777777', 
                    display: 'flex', 
                    alignItems: 'center',
                    transition: 'all 0.2s ease-in-out'
                  }}>
                    {item.icon}
                  </span>
                  {item.label}
                </div>
              );
            })}
          </div>
        </Sidebar>

        {/* Conteúdo Central */}
        <Content style={{ padding: '30px', background: '#f5f5f5', overflowY: 'auto' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', minHeight: '100%', boxShadow: '0px 0px 10px rgba(0,0,0,0.05)' }}>
            {activeKey === '1' && <Agenda />}
            {activeKey === '2' && <Clientes />}
            {activeKey === '3' && <Servicos />}
            {activeKey === '4' && <Horarios />}
            {activeKey === '5' && <Dashboard />}
          </div>
        </Content>
      </Container>
    </Container>
  );
}