import { useState } from 'react';
import { useAuth, UserRole } from '../context/AuthContext';
import { ShieldCheck, Handshake, Lock, ArrowRight } from 'lucide-react';

export default function LoginGateway() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'select' | 'pin'>('select');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const ADMIN_PIN = '1234';

  const handleAdminClick = () => {
    setMode('pin');
    setPin('');
    setError('');
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      login('admin');
    } else {
      setError('Incorrect PIN');
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setPin('');
    }
  };

  const handleBorrowerClick = () => {
    login('borrower');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #060c2a 0%, #0d1b6e 40%, #1a0a3e 70%, #6b0a0a 100%)',
      }}
    >
      <div className="w-full" style={{ maxWidth: 440 }}>
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <img
            src="/images/sshs-logo.jpg"
            alt="SSHS Logo"
            className="rounded-full mx-auto"
            style={{
              width: 100,
              height: 100,
              border: '3px solid #e8b400',
              boxShadow: '0 0 24px rgba(232,180,0,0.4)',
            }}
          />
          <h1 className="font-heading font-bold mt-4" style={{ fontSize: 22, color: '#e8b400' }}>
            SSHS Inventory System
          </h1>
          <p className="font-body mt-1" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            Sucat Senior High School · City of Muntinlupa
          </p>
        </div>

        {mode === 'select' ? (
          /* Role selection */
          <div className="space-y-3">
            <button
              onClick={handleAdminClick}
              className="w-full rounded-2xl p-5 flex items-center gap-4 transition-all hover:scale-[1.02]"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="rounded-xl flex items-center justify-center" style={{ width: 48, height: 48, background: '#0d1b6e' }}>
                <ShieldCheck size={24} color="#e8b400" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-body font-bold" style={{ fontSize: 16, color: 'white' }}>
                  Admin / Property Office
                </div>
                <div className="font-body" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  Full access · Requires PIN
                </div>
              </div>
              <ArrowRight size={20} color="rgba(255,255,255,0.3)" />
            </button>

            <button
              onClick={handleBorrowerClick}
              className="w-full rounded-2xl p-5 flex items-center gap-4 transition-all hover:scale-[1.02]"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="rounded-xl flex items-center justify-center" style={{ width: 48, height: 48, background: '#7c3aed' }}>
                <Handshake size={24} color="white" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-body font-bold" style={{ fontSize: 16, color: 'white' }}>
                  Borrower / Staff
                </div>
                <div className="font-body" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  Search items & submit borrow requests
                </div>
              </div>
              <ArrowRight size={20} color="rgba(255,255,255,0.3)" />
            </button>
          </div>
        ) : (
          /* PIN entry */
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div
              className={`rounded-2xl p-6 ${shake ? 'field-error' : ''}`}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="rounded-xl flex items-center justify-center" style={{ width: 40, height: 40, background: '#0d1b6e' }}>
                  <Lock size={20} color="#e8b400" />
                </div>
                <div>
                  <div className="font-body font-bold" style={{ fontSize: 15, color: 'white' }}>Admin Login</div>
                  <div className="font-body" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Enter your 4-digit PIN</div>
                </div>
              </div>

              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={e => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                autoFocus
                placeholder="● ● ● ●"
                className="w-full text-center py-3 rounded-xl font-body font-bold"
                style={{
                  fontSize: 28,
                  letterSpacing: '12px',
                  background: 'rgba(255,255,255,0.08)',
                  border: `1.5px solid ${error ? '#dc2626' : 'rgba(255,255,255,0.15)'}`,
                  color: 'white',
                  outline: 'none',
                }}
              />
              {error && (
                <p className="font-body text-center mt-2" style={{ fontSize: 12, color: '#f87171' }}>{error}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMode('select')}
                className="flex-1 py-3 rounded-xl font-body font-semibold transition-opacity hover:opacity-90"
                style={{ fontSize: 14, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={pin.length < 4}
                className="flex-1 py-3 rounded-xl font-body font-bold transition-opacity hover:opacity-90"
                style={{
                  fontSize: 14,
                  background: pin.length === 4 ? '#e8b400' : 'rgba(232,180,0,0.3)',
                  color: '#0d1b6e',
                  border: 'none',
                  cursor: pin.length === 4 ? 'pointer' : 'not-allowed',
                }}
              >
                Unlock
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
