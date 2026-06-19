import React from 'react';
import { CrmProvider, useCrm } from './context/CrmContext';

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

function AppContent() {
  const { activeScreen } = useCrm();

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Dashboard />;
      case 'chat':
        return <ChatWindow />;
      case 'pipeline':
        return <KanbanBoard />;
      case 'builder':
        return <FlowBuilder />;
      case 'contacts':
        return <ContactsList />;
      case 'channels':
        return <ChannelsConfig />;
      case 'followup':
        return <FollowUpSettings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Sleek Sidebar navigation panels */}
      <Sidebar />
      
      {/* Main active container viewports */}
      <main style={{
        flex: 1,
        height: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {renderActiveScreen()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <CrmProvider>
      <AppContent />
    </CrmProvider>
  );
}
