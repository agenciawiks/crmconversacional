import React from 'react';
import { CrmProvider, useCrm } from './context/CrmContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import { Loader2 } from 'lucide-react';

// Import CSS stylesheets in sequence
import './styles/variables.css';
import './styles/main.css';
import './styles/dashboard.css';
import './styles/chat.css';
import './styles/kanban.css';
import './styles/builder.css';
import './styles/contacts.css';
import './styles/followup.css';

// Import subcomponents
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ChatWindow from './components/ChatWindow';
import KanbanBoard from './components/KanbanBoard';
import FlowBuilder from './components/FlowBuilder';
import ContactsList from './components/ContactsList';
import ChannelsConfig from './components/ChannelsConfig';
import FollowUpSettings from './components/FollowUpSettings';
import OpenAIStatusBanner from './components/OpenAIStatusBanner';
import CalendarView from './components/CalendarView';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';

function AppContent() {
  const { activeScreen } = useCrm();

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Dashboard />;
      case 'chat':
        return <ChatWindow />;
      case 'kanban':
        return <KanbanBoard />;
      case 'builder':
        return <FlowBuilder />;
      case 'contacts':
        return <ContactsList />;
      case 'channels':
        return <ChannelsConfig />;
      case 'followup':
        return <FollowUpSettings />;
      case 'calendar':
        return <CalendarView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Sleek Sidebar navigation panels */}
      <Sidebar />
      
      {/* Main content area with global status banner */}
      <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Global OpenAI quota warning banner */}
        <OpenAIStatusBanner />

        {/* Active screen viewport */}
        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {renderActiveScreen()}
        </main>
      </div>
    </div>
  );
}

// O AuthGuard fica RESPONSÁVEL por decidir o que montar
// Apenas se tivermos sessão, montamos o CrmProvider (que contém os dados sensíveis)
function AuthGuard() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (!session) {
    // Se não há sessão, renderiza APENAS o login. O CrmContext NUNCA monta.
    return <LoginScreen />;
  }

  // Com sessão confirmada, o CrmProvider e o restante do app montam.
  return (
    <CrmProvider>
      <AppContent />
    </CrmProvider>
  );
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <AuthGuard />
      </AuthProvider>
    </GlobalErrorBoundary>
  );
}
