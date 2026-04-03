import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context';
import { orderService } from '../../services';

const NAV = [
  {
    to: '/admin',
    end: true,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
    label: 'Dashboard',
  },
  {
    to: '/admin/orders',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
    label: 'Orders',
    badge: 'pendingOrders',
  },
  {
    to: '/admin/products',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
    label: 'Products',
  },
  {
    to: '/admin/categories',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
    label: 'Categories',
  },
  {
    to: '/admin/users',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    label: 'Users',
  },
  {
    to: '/admin/analytics',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6"  y1="20" x2="6"  y2="14"/>
      </svg>
    ),
    label: 'Analytics',
  },
  {
    to: '/admin/reviews',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    label: 'Reviews',
  },
  {
    to: '/admin/notifications',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
    label: 'Notifications',
  },
];

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingOrders, setPendingOrders] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const fetchPendingCount = () => {
      orderService.getAllOrders({ page: 1, limit: 1, status: 'pending' })
        .then(res => setPendingOrders(res?.pagination?.total || 0))
        .catch(() => {});
    };

    fetchPendingCount();

    window.addEventListener('folkmint:orders-updated', fetchPendingCount);
    return () => window.removeEventListener('folkmint:orders-updated', fetchPendingCount);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const badges = { pendingOrders };

  return (
    <div className={`al-shell${collapsed ? ' al-collapsed' : ''}`}>

      {/* ── SIDEBAR ── */}
      <aside className="al-sidebar">
        <div className="al-sidebar-inner">

          {/* Brand */}
          <div className="al-brand">
            <svg width="26" height="26" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <path d="M20 2 L38 20 L20 38 L2 20 Z" stroke="#C4922A" strokeWidth="1.4"/>
              <circle cx="20" cy="20" r="5.5" fill="#C4922A"/>
              <circle cx="20" cy="20" r="2.4" fill="#111"/>
            </svg>
            {!collapsed && <span className="al-brand-name">Folk<b>Mint</b> <span className="al-admin-chip">Admin</span></span>}
          </div>

          {/* Nav */}
          <nav className="al-nav" aria-label="Admin navigation">
            {NAV.map(item => {
              const badgeVal = item.badge ? badges[item.badge] : 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `al-nav-item${isActive ? ' active' : ''}`}
                >
                  <span className="al-nav-icon">{item.icon}</span>
                  {!collapsed && <span className="al-nav-label">{item.label}</span>}
                  {badgeVal > 0 && (
                    <span className="al-nav-badge">{badgeVal > 99 ? '99+' : badgeVal}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom: user + logout */}
          <div className="al-sidebar-foot">
            <div className="al-user-row">
              <div className="al-user-avatar">
                {((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')).toUpperCase() || 'A'}
              </div>
              {!collapsed && (
                <div className="al-user-info">
                  <p className="al-user-name">
                    {user?.first_name || user?.last_name
                      ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                      : 'Admin'}
                  </p>
                  <p className="al-user-email">{user?.email}</p>
                </div>
              )}
            </div>
            <button className="al-logout-btn" onClick={handleLogout} title="Log out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {!collapsed && <span>Log out</span>}
            </button>
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          className="al-collapse-btn"
          onClick={() => setCollapsed(v => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            width="14" height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }}
          >
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </aside>

      {/* ── MAIN ── */}
      <main className="al-main">
        {children}
      </main>

      <style>{`
        .al-shell {
          display: grid;
          grid-template-columns: 240px 1fr;
          min-height: 100vh;
          background: var(--bg-alt);
          transition: grid-template-columns .3s var(--ease);
        }
        .al-collapsed {
          grid-template-columns: 64px 1fr;
        }

        /* ── SIDEBAR — always dark, never inverts with theme ── */
        .al-sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          background: #0c1220;
          border-right: 1px solid rgba(255,255,255,.06);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 100;
          transition: width .3s var(--ease);
          box-shadow: 4px 0 24px rgba(0,0,0,0.4);
        }
        .al-sidebar-inner {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
          padding: 20px 0 12px;
        }
        .al-sidebar-inner::-webkit-scrollbar { display: none; }

        /* Brand */
        .al-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 16px 24px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          margin-bottom: 12px;
          white-space: nowrap;
          overflow: hidden;
        }
        .al-brand-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px;
          font-weight: 400;
          color: #f5f1eb;
          letter-spacing: .03em;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .al-brand-name b { font-weight: 700; color: var(--gold); }
        .al-admin-chip {
          font-family: inherit;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          padding: 2px 7px;
          background: rgba(196,146,42,.2);
          border: 1px solid rgba(196,146,42,.35);
          border-radius: 999px;
          color: var(--gold);
        }

        /* Nav */
        .al-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0 10px;
          flex: 1;
        }
        .al-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: calc(var(--r) - 2px);
          text-decoration: none;
          color: rgba(255,255,255,.52) !important;
          font-size: 13.5px;
          font-weight: 500;
          transition: background .2s, color .2s;
          white-space: nowrap;
          overflow: hidden;
          position: relative;
          background: transparent !important;
          border-color: transparent !important;
        }
        .al-nav-item:hover {
          background: rgba(255,255,255,.07) !important;
          color: #f5f1eb !important;
          border-color: transparent !important;
        }
        .al-nav-item.active {
          background: rgba(212,175,55,.18) !important;
          color: #E5C05E !important;
          font-weight: 700;
          border-color: transparent !important;
          box-shadow: inset 3px 0 0 #E5C05E;
        }
        .al-nav-icon { flex-shrink: 0; display: flex; }
        .al-nav-label { flex: 1; }
        .al-nav-badge {
          margin-left: auto;
          background: #dc2626;
          color: #fff !important;
          font-size: 10px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 999px;
          flex-shrink: 0;
        }

        /* Footer */
        .al-sidebar-foot {
          padding: 12px 10px 8px;
          border-top: 1px solid rgba(255,255,255,.08);
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow: hidden;
        }
        .al-user-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          overflow: hidden;
        }
        .al-user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #E5C05E, #b8860b);
          color: #0A1128;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 10px rgba(229,192,94,0.4);
        }
        .al-user-info { min-width: 0; overflow: hidden; }
        .al-user-name {
          font-size: 13px;
          font-weight: 600;
          color: #f5f1eb;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .al-user-email {
          font-size: 11px;
          color: rgba(255,255,255,.4);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .al-logout-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          background: transparent;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: calc(var(--r) - 2px);
          color: rgba(255,255,255,.45);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all .2s;
          white-space: nowrap;
          width: 100%;
        }
        .al-logout-btn:hover {
          background: rgba(220,38,38,.15);
          border-color: rgba(220,38,38,.3);
          color: #fca5a5;
        }

        /* Collapse button */
        .al-collapse-btn {
          position: absolute;
          bottom: 50%;
          right: -12px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #0c1220;
          border: 1px solid rgba(255,255,255,.2);
          color: rgba(255,255,255,.6);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all .2s;
          z-index: 10;
        }
        .al-collapse-btn:hover {
          background: #E5C05E !important;
          border-color: #E5C05E !important;
          color: #0A1128 !important;
        }

        /* ── MAIN ── */
        .al-main {
          min-width: 0;
          overflow-x: hidden;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 860px) {
          .al-shell { grid-template-columns: 1fr; }
          .al-sidebar { display: none; }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;