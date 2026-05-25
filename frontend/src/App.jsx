import { useState } from 'react';
import { Container, Header, Sidebar, Content } from 'rsuite';
import { Calendar, Peoples, Task, Time, BarChart } from '@rsuite/icons';
import 'rsuite/dist/rsuite.min.css';

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

  // Se não tiver token, mostra apenas o Login
  if (!token) return <Login />;

  // Lista dos seus itens de menu para facilitar a criação visual
  const menuItems = [
    { key: '1', label: 'Agendamentos', icon: <Calendar /> },
    { key: '2', label: 'Clientes', icon: <Peoples /> },
    { key: '3', label: 'Serviços', icon: <Task /> },
    { key: '4', label: 'Horários', icon: <Time /> },
    { key: '5', label: 'Painel de Controle', icon: <BarChart /> }
  ];

  return (
    <Container style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Roxo - Estilo Mockup */}
      <Header style={{
        background: '#7B2CBF', // Roxo vibrante exato da imagem
        color: 'white',
        padding: '10px 30px',
        display: 'flex',
        justifyContent: 'flex-end', // Joga o perfil todo para a direita
        alignItems: 'center',
        height: '60px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Hames Barbearia</div>
            <div style={{ fontSize: '12px', color: '#F8F7FF' }}>Plano Gold</div>
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#ccc' // Bolinha cinza do avatar
          }}></div>
          <span style={{ fontSize: '12px', cursor: 'pointer' }}>▼</span>
        </div>
      </Header>

      <Container style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar Escura - Estilo Mockup */}
        <Sidebar style={{ width: 240, background: '#221D25', display: 'flex', flexDirection: 'column' }}>
          
          {/* Logo EasyCut */}
          <div style={{ padding: '30px 25px', fontSize: '28px', fontWeight: 'bold', letterSpacing: '-1px' }}>
            <span style={{ color: 'white' }}>Easy</span>
            <span style={{ color: '#7B2CBF' }}>Cut</span>
          </div>

          {/* Menu Customizado Escuro */}
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
                    color: isActive ? '#ffffff' : '#737074', // Fica branco se estiver selecionado
                    backgroundColor: isActive ? '#17171a' : 'transparent', // Fundo mais escuro no selecionado
                    borderLeft: isActive ? '4px solid #7B2CBF' : '4px solid transparent', // Barrinha roxa lateral
                    fontSize: '15px',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <span style={{ fontSize: '18px', color: isActive ? '#7B2CBF' : '#888888' }}>
                    {item.icon}
                  </span>
                  {item.label}
                </div>
              );
            })}
          </div>
        </Sidebar>

        {/* Conteúdo Central com Fundo Cinza Claro e Card Branco */}
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