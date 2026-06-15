import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Container, Header, Sidebar, Content, CustomProvider, Button } from 'rsuite'; 
import { FaCalendarDays, FaUsers, FaScissors, FaClock, FaChartSimple } from 'react-icons/fa6';
import 'rsuite/dist/rsuite.min.css';
import { FaUserTie } from 'react-icons/fa6';

import logoEasyCut from './assets/LogoEasyCut.png';
import Agenda from './pages/Agenda';
import Login from './pages/Login';
import Clientes from './pages/Clientes';
import Servicos from './pages/Servicos';
import Horarios from './pages/Horarios';
import Dashboard from './pages/Dashboard';
import Barbeiros from './pages/Barbeiros'; 

// Componente para o menu lateral funcionar com as rotas
function SidebarMenu() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/agenda', label: 'Agendamentos', icon: <FaCalendarDays /> },
    { key: '/clientes', label: 'Clientes', icon: <FaUsers /> },
    { key: '/servicos', label: 'Serviços', icon: <FaScissors /> },
    { key: '/horarios', label: 'Horários', icon: <FaClock /> },
    { key: '/barbeiros', label: 'Equipe', icon: <FaUserTie /> },
    { key: '/dashboard', label: 'Painel de Controle', icon: <FaChartSimple /> }
  ];

  return (
    <Sidebar style={{ width: 240, background: '#222226', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '25px 20px', display: 'flex', justifyContent: 'center' }}>
        <img src={logoEasyCut} alt="Logo" style={{ maxWidth: '100%', maxHeight: '60px' }} />
      </div>
      {menuItems.map((item) => {
        const isActive = location.pathname === item.key;
        return (
          <div key={item.key} onClick={() => navigate(item.key)} style={{
            padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px',
            color: isActive ? '#ffffff' : '#aaaaaa', backgroundColor: isActive ? '#17171a' : 'transparent',
            borderLeft: isActive ? '4px solid #7c3aed' : '4px solid transparent'
          }}>
            {item.icon} {item.label}
          </div>
        );
      })}
    </Sidebar>
  );
}

export default function App() {
  const token = localStorage.getItem('token');
  if (!token) return <Login />;

  return (
    <CustomProvider>
      
      {/* Estilo embutido para o botão de sair */}
      <style>
        {`
          .btn-sair {
            background-color: #5C218F !important; /* Roxo um pouco mais escuro que o Header */
            color: white !important;
            border: 1px solid #5C218F !important;
            transition: all 0.3s ease !important;
            font-weight: bold !important;
          }
          .btn-sair:hover {
            background-color: white !important;
            color: #5C218F !important;
            border: 1px solid white !important;
          }
        `}
      </style>

      <BrowserRouter>
        <Container style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          
          <Header style={{ background: '#7B2CBF', color: 'white', padding: '10px 30px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', height: '60px' }}>
            <Button 
              className="btn-sair"
              appearance="primary" 
              onClick={() => {
                localStorage.removeItem('token'); // Remove o login salvo
                window.location.href = '/'; // Redireciona forçando a tela de login a aparecer
              }}
            >
               Sair do Sistema
            </Button>
          </Header>

          <Container style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <SidebarMenu />
            <Content style={{ padding: '30px', background: '#f5f5f5', overflowY: 'auto' }}>
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', minHeight: '100%' }}>
                <Routes>
                  <Route path="/" element={<Navigate to="/agenda" />} />
                  <Route path="/agenda" element={<Agenda />} />
                  <Route path="/clientes" element={<Clientes />} />
                  <Route path="/servicos" element={<Servicos />} />
                  <Route path="/horarios" element={<Horarios />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/barbeiros" element={<Barbeiros />} />
                </Routes>
              </div>
            </Content>
          </Container>
          
        </Container>
      </BrowserRouter>
    </CustomProvider>
  );
}