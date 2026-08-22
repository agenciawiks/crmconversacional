import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { CrmProvider, useCrm } from './context/CrmContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import FirstLoginPrompt from './components/FirstLoginPrompt';
import SessionLoadingScreen from './components/SessionLoadingScreen';

// Import CSS stylesheets in sequence
import './styles/variables.css';
import './styles/main.css';
import './styles/sidebar.css';
import './styles/dashboard.css';
import './styles/auth.css';
import './styles/chat.css';
import './styles/kanban.css';
import './styles/builder.css';
import './styles/contacts.css';
import './styles/calendar.css';
import './styles/channels.css';
import './styles/ai-agent.css';
import './styles/followup.css';
import './styles/provision.css';
import './styles/users.css';

// Import subcomponents
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ChatWindow from './components/ChatWindow';
import KanbanBoard from './components/KanbanBoard';
import FlowBuilder from './components/FlowBuilder';
import ContactsList from './components/ContactsList';
import ChannelsConfig from './components/ChannelsConfig';
import FollowUpSettings from './components/FollowUpSettings';
import UsersManager from './components/UsersManager';
import ProvisionTenant from './components/ProvisionTenant';
import OpenAIStatusBanner from './components/OpenAIStatusBanner';
import CalendarView from './components/CalendarView';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';

function getPermittedScreen(requestedScreen, permissions, isSuperAdmin) {
  const routes = {
    dashboard: 'view_dashboard',
    chat: 'view_chat',
    kanban: 'view_kanban',
    calendar: 'view_calendar',
    builder: 'manage_ai_agent',
    contacts: 'view_contacts',
    channels: 'manage_channels',
    followup: 'manage_followup',
    users: 'manage_users',
    provision: 'superadmin'
  };

  if (!permissions) return 'dashboard';
  
  const reqPerm = routes[requestedScreen];
  if (reqPerm === 'superadmin') {
    return isSuperAdmin ? requestedScreen : 'dashboard';
  }
  if (reqPerm && permissions[reqPerm] === true) return requestedScreen;
  if (!reqPerm) return requestedScreen; // Fallback to let it pass if not explicitly protected

  // Se negado, encontra a primeira tela permitida
  for (const [screen, perm] of Object.entries(routes)) {
    if (permissions[perm] === true) return screen;
  }
  
  return 'dashboard'; // Ultimate fallback
}

function AppContent() {
  const screenStageRef = useRef(null);
  const { activeScreen, setActiveScreen } = useCrm();
  const { permissions, isSuperAdmin } = useAuth();
  
  const permittedScreen = getPermittedScreen(
    activeScreen,
    permissions,
    isSuperAdmin
  );
  
  useEffect(() => {
    if (activeScreen !== permittedScreen) {
      console.warn(`[RBAC] Access to '${activeScreen}' denied. Redirecting to '${permittedScreen}'.`);
      setActiveScreen(permittedScreen);
    }
  }, [activeScreen, permittedScreen, setActiveScreen]);

  useLayoutEffect(() => {
    const stage = screenStageRef.current;
    if (!stage) return undefined;

    const tween = gsap.fromTo(
      stage,
      { x: 12, autoAlpha: 0 },
      { x: 0, autoAlpha: 1, duration: 0.32, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }
    );
    return () => tween.kill();
  }, [permittedScreen]);

  const renderActiveScreen = () => {
    switch (permittedScreen) {
      case 'dashboard': return <Dashboard />;
      case 'chat': return <ChatWindow />;
      case 'kanban': return <KanbanBoard />;
      case 'builder': return <FlowBuilder />;
      case 'contacts': return <ContactsList />;
      case 'channels': return <ChannelsConfig />;
      case 'followup': return <FollowUpSettings />;
      case 'calendar': return <CalendarView />;
      case 'users': return <UsersManager />;
      case 'provision': return <ProvisionTenant />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <a className="crm-skip-link" href="#crm-main-content">Pular para o conteúdo</a>
      <Sidebar />

      <div className="app-workspace">
        <OpenAIStatusBanner />

        <main id="crm-main-content" className="app-viewport" tabIndex="-1">
          <div ref={screenStageRef} key={permittedScreen} className="app-screen-stage">
            {renderActiveScreen()}
          </div>
        </main>
      </div>
    </div>
  );
}

// O AuthGuard fica RESPONSÁVEL por decidir o que montar
// Apenas se tivermos sessão, montamos o CrmProvider (que contém os dados sensíveis)
function AuthGuard() {
  const { session, loading, profile, effectiveTenantId } = useAuth();

  if (loading) {
    return <SessionLoadingScreen />;
  }

  if (!session) {
    // Se não há sessão, renderiza APENAS o login. O CrmContext NUNCA monta.
    return <LoginScreen />;
  }

  // Verifica se é o primeiro login e precisa tomar uma ação (mudar ou manter senha)
  if (profile?.first_login) {
    return <FirstLoginPrompt />;
  }

  // Com sessão confirmada e sem pendência, o CrmProvider e o restante do app montam.
  return (
    <CrmProvider
      key={effectiveTenantId || 'tenant-loading'}
      tenantId={effectiveTenantId}
    >
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
