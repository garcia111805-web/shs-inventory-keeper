import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InventoryProvider } from './context/InventoryContext';
import Index from './pages/Index';
import LoginGateway from './pages/LoginGateway';

// ─── SIMPLE ERROR BOUNDARY ───────────────────────────────────────────────────
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, background: '#fee2e2', color: '#b91c1c', fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: 24 }}>Something went wrong.</h1>
          <pre style={{ background: 'white', padding: 20, borderRadius: 8, marginTop: 20, overflow: 'auto' }}>
            {this.state.error?.stack || this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '10px 20px', cursor: 'pointer' }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { role } = useAuth();

  if (!role) return <LoginGateway />;

  return (
    <InventoryProvider>
      <Index />
    </InventoryProvider>
  );
}

import { ThemeProvider } from './context/ThemeContext';

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
