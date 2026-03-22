import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context';
import './Login.css';
import { useCart } from '../context';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EyeIcon = ({ open }) =>
  open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [emailTouched,setEmailTouched]= useState(false);
  const [apiError,    setApiError]    = useState('');
  const [loading,     setLoading]     = useState(false);

  const emailInvalid = emailTouched && email && !EMAIL_RE.test(email);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setApiError('');

    if (!EMAIL_RE.test(email)) {
      setEmailTouched(true);
      setApiError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await login(email, password);
      if (response?.user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      const raw = err?.error || err?.message || '';
      const msg = (raw === 'Network Error' || err?.code === 'ERR_NETWORK')
        ? 'Cannot reach the server. Please make sure the backend is running.'
        : raw || 'Login failed. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }, [email, password, login, navigate]);

  return (
    <div className="auth-page">
      {/* Decorative panel */}
      <div className="auth-panel" aria-hidden="true">
        <div className="auth-panel-inner">
          <svg className="auth-panel-logo" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">
            <path d="M20 2 L38 20 L20 38 L2 20 Z" stroke="#C4922A" strokeWidth="1.4"/>
            <path d="M20 9 L31 20 L20 31 L9 20 Z" fill="#C4922A" opacity=".18"/>
            <circle cx="20" cy="20" r="5.5" fill="#C4922A"/>
            <circle cx="20" cy="20" r="2.4" fill="#0d0d0d"/>
            <circle cx="20" cy="8"  r="1.8" fill="#C4922A"/>
            <circle cx="32" cy="20" r="1.8" fill="#C4922A"/>
            <circle cx="20" cy="32" r="1.8" fill="#C4922A"/>
            <circle cx="8"  cy="20" r="1.8" fill="#C4922A"/>
          </svg>
          <p className="auth-panel-brand">Folk<b>Mint</b></p>
          <p className="auth-panel-tagline">Handcrafted treasures from the heart of Bangladesh</p>
          <svg className="auth-panel-art" viewBox="0 0 280 280" fill="none" stroke="#C4922A" strokeLinecap="round">
            <rect x="10" y="10" width="260" height="260" strokeWidth=".7" opacity=".4"/>
            <polygon points="140,12 268,140 140,268 12,140" strokeWidth=".9" opacity=".5"/>
            <polygon points="140,44 236,140 140,236 44,140" strokeWidth=".7" opacity=".4"/>
            <polygon points="140,80 200,140 140,200 80,140" strokeWidth=".6" opacity=".35"/>
            <line x1="140" y1="10" x2="140" y2="270" strokeWidth=".4" opacity=".3"/>
            <line x1="10"  y1="140" x2="270" y2="140" strokeWidth=".4" opacity=".3"/>
            <circle cx="140" cy="14"  r="4" fill="#C4922A" opacity=".7"/>
            <circle cx="266" cy="140" r="4" fill="#C4922A" opacity=".7"/>
            <circle cx="140" cy="266" r="4" fill="#C4922A" opacity=".7"/>
            <circle cx="14"  cy="140" r="4" fill="#C4922A" opacity=".7"/>
            <g transform="translate(140,140)">
              <ellipse rx="7" ry="28" cy="-22" fill="#C4922A" opacity=".5"/>
              <ellipse rx="7" ry="28" cy="-22" fill="#C4922A" opacity=".5" transform="rotate(60)"/>
              <ellipse rx="7" ry="28" cy="-22" fill="#C4922A" opacity=".5" transform="rotate(120)"/>
              <ellipse rx="7" ry="28" cy="-22" fill="#C4922A" opacity=".5" transform="rotate(180)"/>
              <ellipse rx="7" ry="28" cy="-22" fill="#C4922A" opacity=".5" transform="rotate(240)"/>
              <ellipse rx="7" ry="28" cy="-22" fill="#C4922A" opacity=".5" transform="rotate(300)"/>
              <circle r="14" fill="#C4922A" opacity=".85"/>
              <circle r="7"  fill="none" strokeWidth="1.5" stroke="#f5f1eb"/>
              <circle r="3.5" fill="#f5f1eb"/>
            </g>
          </svg>
        </div>
      </div>

      {/* Form card */}
      <div className="auth-card">
        <div className="auth-card-inner">
          <div className="auth-logo-mobile" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <path d="M20 2 L38 20 L20 38 L2 20 Z" stroke="#C4922A" strokeWidth="1.4"/>
              <circle cx="20" cy="20" r="5.5" fill="#C4922A"/>
              <circle cx="20" cy="20" r="2.4" fill="#111"/>
            </svg>
            <span className="auth-logo-name">Folk<b>Mint</b></span>
          </div>

          <h1 className="auth-heading">Welcome back</h1>
          <p className="auth-subheading">Sign in to your account</p>

          {apiError && (
            <div className="auth-alert auth-alert-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {/* Email */}
            <div className={`af-group${emailInvalid ? ' af-group-error' : ''}`}>
              <label className="af-label" htmlFor="login-email">Email address</label>
              <input
                className="af-input"
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                placeholder="you@example.com"
                onChange={e => { setEmail(e.target.value); setApiError(''); }}
                onBlur={() => setEmailTouched(true)}
                required
              />
              {emailInvalid && (
                <span className="af-field-error">Please enter a valid email address.</span>
              )}
            </div>

            {/* Password */}
            <div className="af-group">
              <label className="af-label" htmlFor="login-password">Password</label>
              <div className="af-input-wrap">
                <input
                  className="af-input"
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  placeholder="Enter your password"
                  onChange={e => { setPassword(e.target.value); setApiError(''); }}
                  required
                />
                <button
                  type="button"
                  className="af-eye"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </div>

            <button className="auth-submit-btn" type="submit" disabled={loading}>
              {loading
                ? <><span className="af-spinner" /> Signing in…</>
                : 'Sign In'
              }
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
