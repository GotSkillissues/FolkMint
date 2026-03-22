import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context';
import { useCart } from '../context';
import './Login.css';

/* ── helpers ── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REQS = [
  { key: 'len',     label: 'At least 6 characters',       test: p => p.length >= 6 },
  { key: 'upper',   label: 'At least one uppercase letter', test: p => /[A-Z]/.test(p) },
  { key: 'number',  label: 'At least one number',           test: p => /[0-9]/.test(p) },
];

const STRENGTH_LEVELS = [
  { label: '',          color: 'transparent', width: '0%'   },
  { label: 'Weak',      color: '#e53935',     width: '33%'  },
  { label: 'Fair',      color: '#fb8c00',     width: '66%'  },
  { label: 'Strong',    color: '#43a047',     width: '100%' },
];

function getStrength(pw) {
  if (!pw) return STRENGTH_LEVELS[0];
  const score = Math.min(REQS.filter(r => r.test(pw)).length, 3);
  return { ...STRENGTH_LEVELS[score], score };
}

/* ── sub-components ── */
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

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

/* ── main component ── */
const Register = () => {
  const navigate  = useNavigate();
  const { register } = useAuth();
  const { syncGuestCartAndLoad } = useCart();

  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [showCf,      setShowCf]      = useState(false);
  const [emailTouched,setEmailTouched]= useState(false);
  const [pwTouched,   setPwTouched]   = useState(false);
  const [cfTouched,   setCfTouched]   = useState(false);
  const [apiError,    setApiError]    = useState('');
  const [success,     setSuccess]     = useState('');
  const [loading,     setLoading]     = useState(false);

  const strength      = getStrength(password);
  const metReqs       = REQS.map(r => ({ ...r, met: r.test(password) }));
  const emailInvalid  = emailTouched && email && !EMAIL_RE.test(email);
  const confirmNoMatch= cfTouched && confirm && confirm !== password;
  const confirmMatch  = cfTouched && confirm && confirm === password;

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setApiError('');
    setSuccess('');

    /* client-side validation */
    if (!EMAIL_RE.test(email)) {
      setEmailTouched(true);
      setApiError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setPwTouched(true);
      setApiError('Password must be at least 6 characters long.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setPwTouched(true);
      setApiError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setPwTouched(true);
      setApiError('Password must contain at least one number.');
      return;
    }
    if (password !== confirm) {
      setCfTouched(true);
      setApiError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({
        first_name: firstName.trim() || undefined,
        last_name:  lastName.trim()  || undefined,
        email:      email.trim(),
        password,
      });
      await syncGuestCartAndLoad();
      setSuccess('Account created! Redirecting…');
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      const raw = err?.error || err?.message || '';
      const msg = (raw === 'Network Error' || err?.code === 'ERR_NETWORK')
        ? 'Cannot reach the server. Please make sure the backend is running.'
        : raw || 'Registration failed. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }, [firstName, lastName, email, password, confirm, register, navigate, syncGuestCartAndLoad]);

  return (
    <div className="auth-page">
      {/* Decorative panel */}
      <div className="auth-panel" aria-hidden="true">
        <div className="auth-panel-inner">
          <svg className="auth-panel-logo" viewBox="0 0 40 40" fill="none">
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
      <div className="auth-card auth-card-register">
        <div className="auth-card-inner">
          <div className="auth-logo-mobile" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <path d="M20 2 L38 20 L20 38 L2 20 Z" stroke="#C4922A" strokeWidth="1.4"/>
              <circle cx="20" cy="20" r="5.5" fill="#C4922A"/>
              <circle cx="20" cy="20" r="2.4" fill="#111"/>
            </svg>
            <span className="auth-logo-name">Folk<b>Mint</b></span>
          </div>

          <h1 className="auth-heading">Create account</h1>
          <p className="auth-subheading">Join the FolkMint community</p>

          {apiError && (
            <div className="auth-alert auth-alert-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {apiError}
            </div>
          )}

          {success && (
            <div className="auth-alert auth-alert-success" role="status">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>

            {/* First + Last name row */}
            <div className="af-row">
              <div className="af-group">
                <label className="af-label" htmlFor="reg-firstname">First name</label>
                <input
                  className="af-input"
                  id="reg-firstname"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  placeholder="John"
                  onChange={e => setFirstName(e.target.value)}
                />
              </div>
              <div className="af-group">
                <label className="af-label" htmlFor="reg-lastname">Last name</label>
                <input
                  className="af-input"
                  id="reg-lastname"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  placeholder="Doe"
                  onChange={e => setLastName(e.target.value)}
                />
              </div>
            </div>

            {/* Email */}
            <div className={`af-group${emailInvalid ? ' af-group-error' : ''}`}>
              <label className="af-label" htmlFor="reg-email">
                Email address <span className="af-required">*</span>
              </label>
              <input
                className="af-input"
                id="reg-email"
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
            <div className={`af-group${pwTouched && password && password.length < 6 ? ' af-group-error' : ''}`}>
              <label className="af-label" htmlFor="reg-password">
                Password <span className="af-required">*</span>
              </label>
              <div className="af-input-wrap">
                <input
                  className="af-input"
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  placeholder="Create a strong password"
                  onChange={e => { setPassword(e.target.value); setPwTouched(true); setApiError(''); }}
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

              {/* Strength bar */}
              {password && (
                <div className="pw-strength">
                  <div className="pw-strength-track">
                    <div
                      className="pw-strength-bar"
                      style={{ width: strength.width, background: strength.color }}
                    />
                  </div>
                  <span className="pw-strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}

              {/* Requirements checklist */}
              {(pwTouched || password) && (
                <ul className="pw-reqs" aria-label="Password requirements">
                  {metReqs.map(req => (
                    <li key={req.key} className={`pw-req ${req.met ? 'pw-req-met' : 'pw-req-unmet'}`}>
                      <span className="pw-req-icon">{req.met ? <CheckIcon /> : <XIcon />}</span>
                      {req.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Confirm password */}
            <div className={`af-group${confirmNoMatch ? ' af-group-error' : ''}`}>
              <label className="af-label" htmlFor="reg-confirm">
                Confirm password <span className="af-required">*</span>
              </label>
              <div className="af-input-wrap">
                <input
                  className={`af-input${confirmMatch ? ' af-input-ok' : ''}${confirmNoMatch ? ' af-input-err' : ''}`}
                  id="reg-confirm"
                  type={showCf ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  placeholder="Re-enter your password"
                  onChange={e => { setConfirm(e.target.value); setCfTouched(true); setApiError(''); }}
                  required
                />
                <button
                  type="button"
                  className="af-eye"
                  onClick={() => setShowCf(v => !v)}
                  aria-label={showCf ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <EyeIcon open={showCf} />
                </button>
              </div>
              {confirmNoMatch && (
                <span className="af-field-error">Passwords do not match.</span>
              )}
              {confirmMatch && (
                <span className="af-field-ok">Passwords match.</span>
              )}
            </div>

            <button className="auth-submit-btn" type="submit" disabled={loading}>
              {loading
                ? <><span className="af-spinner" /> Creating account…</>
                : 'Create Account'
              }
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
