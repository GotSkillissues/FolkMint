import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService, orderService } from '../services';

const fmt = (n) => '৳' + Number(n || 0).toLocaleString('en-BD');
const fmtNum = (n) => Number(n || 0).toLocaleString('en-BD');

const KPI = ({ label, value, sub, accent }) => (
  <div className="adash-kpi">
    <p className="adash-kpi-label">{label}</p>
    <p className="adash-kpi-value" style={accent ? { color: accent } : {}}>{value}</p>
    {sub && <p className="adash-kpi-sub">{sub}</p>}
  </div>
);

const SectionHead = ({ title, to, linkLabel }) => (
  <div className="adash-sec-head">
    <h3>{title}</h3>
    {to && <Link to={to} className="adash-sec-link">{linkLabel || 'View all'}</Link>}
  </div>
);

const Badge = ({ status }) => {
  const color = orderService.getStatusColor(status);
  return (
    <span className="adash-badge" style={{ background: color + '18', color, borderColor: color + '40' }}>
      {orderService.getStatusLabel(status)}
    </span>
  );
};

const AdminDashboard = () => {
  const [stats, setStats]     = useState(null);
  const [activity, setActivity] = useState({ recent_orders: [], recent_users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [statsRes, activityRes] = await Promise.all([
          adminService.getDashboardStats(),
          adminService.getRecentActivity(8),
        ]);
        if (!active) return;
        setStats(statsRes);
        setActivity(activityRes);
      } catch (err) {
        if (active) setError(err?.error || err?.message || 'Failed to load dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  return (
    <div className="adash-page">

      {/* ── PAGE HEAD ── */}
      <div className="adash-head">
        <div>
          <p className="adash-eyebrow">Admin</p>
          <h1 className="adash-title">Dashboard</h1>
        </div>
        <div className="adash-head-actions">
          <Link to="/admin/products" className="adash-nav-btn">Products</Link>
          <Link to="/admin/orders"   className="adash-nav-btn">Orders</Link>
          <Link to="/admin/users"    className="adash-nav-btn">Users</Link>
        </div>
      </div>

      {error && (
        <div className="adash-alert adash-alert-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="adash-loading">
          <div className="adash-spinner" />
          <p>Loading dashboard…</p>
        </div>
      ) : stats && (
        <>
          {/* ── REVENUE ROW ── */}
          <div className="adash-row-label">Revenue</div>
          <div className="adash-kpi-grid adash-kpi-grid-3">
            <KPI label="All Time Revenue"    value={fmt(stats.revenue?.total)}          sub="Excluding cancelled orders" />
            <KPI label="Last 30 Days"        value={fmt(stats.revenue?.last_30_days)}   sub={`${fmtNum(stats.orders?.last_30_days)} orders`} />
            <KPI label="Last 7 Days"         value={fmt(stats.revenue?.last_7_days)}    sub={`${fmtNum(stats.orders?.last_7_days)} orders`} />
          </div>

          {/* ── OPERATIONS ROW ── */}
          <div className="adash-row-label">Operations</div>
          <div className="adash-kpi-grid adash-kpi-grid-4">
            <KPI label="Total Orders"        value={fmtNum(stats.orders?.total)} />
            <KPI label="Pending Orders"      value={fmtNum(stats.alerts?.pending_orders)}    accent="#d97706" />
            <KPI label="Active Products"     value={fmtNum(stats.products?.active)}     sub={`${fmtNum(stats.products?.inactive)} inactive`} />
            <KPI label="Low Stock Variants"  value={fmtNum(stats.alerts?.low_stock_variants)} accent={stats.alerts?.low_stock_variants > 0 ? '#dc2626' : undefined} />
          </div>

          {/* ── CUSTOMERS ROW ── */}
          <div className="adash-row-label">Customers</div>
          <div className="adash-kpi-grid adash-kpi-grid-3">
            <KPI label="Total Customers"     value={fmtNum(stats.customers?.total)} />
            <KPI label="New This Month"      value={fmtNum(stats.customers?.new_last_30_days)} />
            <KPI label="New This Week"       value={fmtNum(stats.customers?.new_last_7_days)} />
          </div>

          {/* ── RECENT ACTIVITY ── */}
          <div className="adash-two-col">

            {/* Recent orders */}
            <div className="adash-card">
              <SectionHead title="Recent Orders" to="/admin/orders" linkLabel="All orders" />
              {!activity.recent_orders?.length ? (
                <p className="adash-empty">No orders yet.</p>
              ) : (
                <div className="adash-activity-list">
                  {activity.recent_orders.map(order => (
                    <div key={order.order_id} className="adash-activity-row">
                      <div className="adash-activity-main">
                        <span className="adash-order-id">#{order.order_id}</span>
                        <span className="adash-activity-name">
                          {order.first_name || order.last_name
                            ? `${order.first_name || ''} ${order.last_name || ''}`.trim()
                            : order.email}
                        </span>
                      </div>
                      <div className="adash-activity-meta">
                        <Badge status={order.status} />
                        <span className="adash-activity-amount">{fmt(order.total_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent users */}
            <div className="adash-card">
              <SectionHead title="New Members" to="/admin/users" linkLabel="All users" />
              {!activity.recent_users?.length ? (
                <p className="adash-empty">No users yet.</p>
              ) : (
                <div className="adash-activity-list">
                  {activity.recent_users.map(u => (
                    <div key={u.user_id} className="adash-activity-row">
                      <div className="adash-activity-main">
                        <div className="adash-avatar">
                          {((u.first_name?.[0] || '') + (u.last_name?.[0] || '')).toUpperCase() || u.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="adash-activity-name">
                            {u.first_name || u.last_name
                              ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                              : '—'}
                          </p>
                          <p className="adash-activity-sub">{u.email}</p>
                        </div>
                      </div>
                      <div className="adash-activity-meta">
                        <span className={`adash-role-chip ${u.role === 'admin' ? 'adash-role-admin' : 'adash-role-customer'}`}>
                          {u.role}
                        </span>
                        <span className="adash-activity-sub">
                          {new Date(u.created_at).toLocaleDateString('en-BD', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}

      <style>{`
        .adash-page {
          width: 100%;
          padding: 40px 48px 64px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--bg-alt);
          min-height: 100vh;
        }

        /* ── HEAD ── */
        .adash-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 16px;
        }
        .adash-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--gold);
          margin: 0 0 6px;
        }
        .adash-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600;
          color: var(--dark);
          line-height: 1.1;
          margin: 0;
        }
        .adash-head-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .adash-nav-btn {
          display: inline-flex;
          align-items: center;
          padding: 9px 20px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          font-size: 13px;
          font-weight: 600;
          color: var(--dark);
          text-decoration: none;
          transition: border-color .2s, color .2s, box-shadow .2s;
        }
        .adash-nav-btn:hover {
          border-color: var(--gold);
          color: var(--gold);
          box-shadow: var(--sh-sm);
        }

        /* ── ALERT ── */
        .adash-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: var(--r);
          font-size: 13.5px;
        }
        .adash-alert-error {
          background: #fff2f3;
          border: 1px solid #f5c2c7;
          color: #9f1239;
        }

        /* ── LOADING ── */
        .adash-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 64px;
          color: var(--muted);
          font-size: 14px;
        }
        @keyframes adash-spin { to { transform: rotate(360deg); } }
        .adash-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid var(--border);
          border-top-color: var(--gold);
          border-radius: 50%;
          animation: adash-spin .7s linear infinite;
        }

        /* ── ROW LABEL ── */
        .adash-row-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: var(--muted);
          margin-top: 8px;
        }

        /* ── KPI GRIDS ── */
        .adash-kpi-grid {
          display: grid;
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
        }
        .adash-kpi-grid-3 { grid-template-columns: repeat(3, 1fr); }
        .adash-kpi-grid-4 { grid-template-columns: repeat(4, 1fr); }

        .adash-kpi {
          background: var(--bg-card);
          padding: 24px 28px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .adash-kpi-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--muted);
          margin: 0;
        }
        .adash-kpi-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 700;
          color: var(--dark);
          line-height: 1;
          margin: 0;
        }
        .adash-kpi-sub {
          font-size: 12px;
          color: var(--muted);
          margin: 0;
        }

        /* ── TWO COL ── */
        .adash-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 8px;
        }

        /* ── CARD ── */
        .adash-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 24px 28px;
        }
        .adash-sec-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .adash-sec-head h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--dark);
          margin: 0;
        }
        .adash-sec-link {
          font-size: 12px;
          font-weight: 600;
          color: var(--gold);
          text-decoration: none;
          letter-spacing: .04em;
          transition: color .2s;
        }
        .adash-sec-link:hover { color: var(--dark); }

        /* ── ACTIVITY LIST ── */
        .adash-activity-list {
          display: flex;
          flex-direction: column;
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 6px;
          overflow: hidden;
        }
        .adash-activity-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          background: var(--bg-card);
          transition: background .2s;
        }
        .adash-activity-row:hover { background: var(--bg); }
        .adash-activity-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .adash-activity-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .adash-order-id {
          font-family: ui-monospace, monospace;
          font-size: 12px;
          font-weight: 700;
          color: var(--muted);
          white-space: nowrap;
        }
        .adash-activity-name {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--dark);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }
        .adash-activity-sub {
          font-size: 12px;
          color: var(--muted);
          margin: 0;
        }
        .adash-activity-amount {
          font-size: 13px;
          font-weight: 700;
          color: var(--dark);
          white-space: nowrap;
        }

        /* ── AVATAR ── */
        .adash-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--gold);
          color: var(--dark);
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* ── BADGE ── */
        .adash-badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 9px;
          border-radius: 999px;
          border: 1px solid;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .04em;
          white-space: nowrap;
        }

        /* ── ROLE CHIPS ── */
        .adash-role-chip {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .04em;
          border: 1px solid;
        }
        .adash-role-admin {
          background: #fff7e6;
          color: #b45309;
          border-color: #fcd9a0;
        }
        .adash-role-customer {
          background: #f0faf3;
          color: #15803d;
          border-color: #bbe5c8;
        }

        .adash-empty {
          font-size: 13.5px;
          color: var(--muted);
          text-align: center;
          padding: 24px;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 1100px) {
          .adash-page { padding: 32px 28px 56px; }
          .adash-kpi-grid-4 { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 860px) {
          .adash-page { padding: 24px 20px 48px; }
          .adash-kpi-grid-3 { grid-template-columns: 1fr; }
          .adash-kpi-grid-4 { grid-template-columns: 1fr 1fr; }
          .adash-two-col { grid-template-columns: 1fr; }
          .adash-head { flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 520px) {
          .adash-kpi-grid-4 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;