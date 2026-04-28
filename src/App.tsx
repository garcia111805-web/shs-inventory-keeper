import { AuthProvider, useAuth } from './context/AuthContext';
import { InventoryProvider } from './context/InventoryContext';
import Index from './pages/Index';
import LoginGateway from './pages/LoginGateway';

function AppContent() {
  const { role } = useAuth();

  if (!role) return <LoginGateway />;

  return (
    <InventoryProvider>
      <Index />
    </InventoryProvider>
  );
}

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
