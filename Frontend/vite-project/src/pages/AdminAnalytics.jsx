import { useEffect, useState, useCallback } from 'react';
import { adminService } from '../services';

const fmt    = (n) => '৳' + Number(n || 0).toLocaleString('en-BD');
const fmtNum = (n) => Number(n || 0).toLocaleString('en-BD');

const STATUS_META = {
  pending:    { color: '#d97706', bg: '#fff7e6' },
  confirmed:  { color: '#2563eb', bg: '#eff6ff' },
  processing: { color: '#0891b2', bg: '#f0f9ff' },
  shipped:    { color: '#7c3aed', bg: '#f5f3ff' },
  delivered:  { color: '#15803d', bg: '#f0faf3' },
  cancelled:  { color: '#9f1239', bg: '#fff2f3' },
};

const SectionHead = ({ title, sub }) => (
  <div className="an-sec-head">
    <h2 className="an-sec-title">{title}</h2>
    {sub && <p className="an-sec-sub">{sub}</p>}
  </div>
);

const AdminAnalytics = () => {
  const [dashboard, setDashboard]   = useState(null);
  const [sales, setSales]           = useState([]);
  const [period, setPeriod]         = useState('daily');
  const [days, setDays]             = useState(30);
  const [topProducts, setTopProducts] = useState([]);
  const [topSort, setTopSort]       = useState('revenue');
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [lowStock, setLowStock]     = useState([]);
  const [threshold, setThreshold]   = useState(5);
  const [catPerf, setCatPerf]       = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);
  const [topLoading, setTopLoading] = useState(false);
  const [error, setError]           = useState('');

  /* ── initial load ── */
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [dashRes, statusRes, catRes, reviewRes, lowRes] = await Promise.all([
          adminService.getDashboardStats(),
          adminService.getOrderStatusBreakdown(),
          adminService.getCategoryPerformance(),
          adminService.getReviewStats(),
          adminService.getLowStock({ threshold, limit: 10 }),
        ]);
        if (!active) return;
        setDashboard(dashRes);
        setStatusBreakdown(Array.isArray(statusRes?.breakdown) ? statusRes.breakdown : []);
        setCatPerf(Array.isArray(catRes?.categories) ? catRes.categories : []);
        setReviewStats(reviewRes);
        setLowStock(Array.isArray(lowRes?.variants) ? lowRes.variants : []);
      } catch (err) {
        if (active) setError(err?.response?.data?.error || 'Failed to load analytics.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []); // eslint-disable-line

  /* ── sales report ── */
  const loadSales = useCallback(async (p = period, d = days) => {
    setSalesLoading(true);
    try {
      const res = await adminService.getSalesReport({ period: p, days: d });
      setSales(Array.isArray(res?.report) ? res.report : []);
    } catch {
      setSales([]);
    } finally {
      setSalesLoading(false);
    }
  }, [period, days]);

  useEffect(() => { loadSales(); }, []); // eslint-disable-line

  /* ── top products ── */
  const loadTopProducts = useCallback(async (sort = topSort) => {
    setTopLoading(true);
    try {
      const res = await adminService.getTopProducts({ sort_by: sort, limit: 10 });
      setTopProducts(Array.isArray(res?.products) ? res.products : []);
    } catch {
      setTopProducts([]);
    } finally {
      setTopLoading(false);
    }
  }, [topSort]);

  useEffect(() => { loadTopProducts(); }, []); // eslint-disable-line

  /* ── low stock reload ── */
  const reloadLowStock = async () => {
    try {
      const res = await adminService.getLowStock({ threshold, limit: 20 });
      setLowStock(Array.isArray(res?.variants) ? res.variants : []);
    } catch { /* silent */ }
  };

  /* ── bar chart helpers ── */
  const maxRevenue = sales.length ? Math.max(...sales.map(r => Number(r.revenue || 0)), 1) : 1;

  /* ── star bar ── */
  const totalReviews = reviewStats?.summary?.total_reviews || 0;
  const starKeys = ['five_star', 'four_star', 'three_star', 'two_star', 'one_star'];
  const starLabels = ['5', '4', '3', '2', '1'];

  if (loading) return (
    <div className="an-page">
      <div className="an-loading"><div className="an-spinner an-spinner-lg" /><p>Loading analytics…</p></div>
    </div>
  );

  return (
    <div className="an-page">

      {/* ── HEAD ── */}
      <div className="an-head">
        <div>
          <p className="an-eyebrow">Admin</p>
          <h1 className="an-title">Analytics</h1>
        </div>
      </div>

      {error && <div className="an-error">{error}</div>}

      {/* ── KPI STRIP ── */}
      {dashboard && (
        <div className="an-kpi-strip">
          {[
            { label: 'Total Revenue',    value: fmt(dashboard.revenue?.total),           sub: 'All time' },
            { label: 'Revenue (30d)',    value: fmt(dashboard.revenue?.last_30_days),     sub: `${fmtNum(dashboard.orders?.last_30_days)} orders` },
            { label: 'Total Orders',     value: fmtNum(dashboard.orders?.total),          sub: `${fmtNum(dashboard.orders?.pending)} pending` },
            { label: 'Customers',        value: fmtNum(dashboard.customers?.total),       sub: `+${fmtNum(dashboard.customers?.new_last_30_days)} this month` },
            { label: 'Active Products',  value: fmtNum(dashboard.products?.active),       sub: `${fmtNum(dashboard.products?.inactive)} inactive` },
            { label: 'Low Stock',        value: fmtNum(dashboard.alerts?.low_stock_variants), sub: 'Variants ≤ 5 units', accent: dashboard.alerts?.low_stock_variants > 0 ? '#dc2626' : undefined },
          ].map(k => (
            <div key={k.label} className="an-kpi">
              <p className="an-kpi-label">{k.label}</p>
              <p className="an-kpi-value" style={k.accent ? { color: k.accent } : {}}>{k.value}</p>
              <p className="an-kpi-sub">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── SALES REPORT ── */}
      <div className="an-card">
        <SectionHead title="Sales Report" sub="Revenue over time from non-cancelled orders" />
        <div className="an-sales-controls">
          <div className="an-chip-group">
            {[['daily','Daily'],['weekly','Weekly'],['monthly','Monthly']].map(([val, label]) => (
              <button
                key={val}
                className={`an-chip${period === val ? ' active' : ''}`}
                onClick={() => { setPeriod(val); loadSales(val, days); }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="an-chip-group">
            {[[7,'7d'],[30,'30d'],[90,'90d'],[365,'1y']].map(([d, label]) => (
              <button
                key={d}
                className={`an-chip${days === d ? ' active' : ''}`}
                onClick={() => { setDays(d); loadSales(period, d); }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {salesLoading ? (
          <div className="an-chart-loading"><div className="an-spinner" /> Loading…</div>
        ) : !sales.length ? (
          <p className="an-empty">No sales data for this period.</p>
        ) : (
          <>
            <div className="an-bar-chart">
              {sales.slice(-30).map((row, i) => {
                const h = Math.max(4, (Number(row.revenue || 0) / maxRevenue) * 100);
                return (
                  <div key={i} className="an-bar-col" title={`${row.period_label || row.period}: ${fmt(row.revenue)} · ${row.order_count} orders`}>
                    <div className="an-bar" style={{ height: `${h}%` }} />
                    {i % Math.ceil(sales.length / 8) === 0 && (
                      <span className="an-bar-label">{String(row.period_label || row.period || '').slice(-5)}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="an-sales-table-wrap">
              <table className="an-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                    <th>Avg Order</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice().reverse().slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      <td>{row.period_label || row.period}</td>
                      <td>{fmtNum(row.order_count)}</td>
                      <td className="an-td-strong">{fmt(row.revenue)}</td>
                      <td>{row.order_count > 0 ? fmt(Number(row.revenue) / Number(row.order_count)) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── TWO COL ── */}
      <div className="an-two-col">

        {/* Order status breakdown */}
        <div className="an-card">
          <SectionHead title="Order Status Breakdown" />
          {!statusBreakdown.length ? (
            <p className="an-empty">No order data.</p>
          ) : (
            <div className="an-status-list">
              {statusBreakdown.map(row => {
                const meta = STATUS_META[row.status] || { color: '#64748b', bg: '#f8fafc' };
                const pct  = Number(row.percentage || 0);
                return (
                  <div key={row.status} className="an-status-row">
                    <div className="an-status-label-row">
                      <span className="an-status-dot" style={{ background: meta.color }} />
                      <span className="an-status-name">{row.status}</span>
                      <span className="an-status-count">{fmtNum(row.count)}</span>
                      <span className="an-status-pct">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="an-progress-track">
                      <div
                        className="an-progress-bar"
                        style={{ width: `${pct}%`, background: meta.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="an-card">
          <div className="an-sec-head-row">
            <SectionHead title="Top Products" />
            <div className="an-chip-group">
              {[['revenue','Revenue'],['quantity','Quantity'],['orders','Orders']].map(([val, label]) => (
                <button
                  key={val}
                  className={`an-chip an-chip-sm${topSort === val ? ' active' : ''}`}
                  onClick={() => { setTopSort(val); loadTopProducts(val); }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {topLoading ? (
            <div className="an-chart-loading"><div className="an-spinner" /> Loading…</div>
          ) : !topProducts.length ? (
            <p className="an-empty">No product sales data yet.</p>
          ) : (
            <table className="an-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Revenue</th>
                  <th>Units</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.product_id}>
                    <td className="an-rank">{i + 1}</td>
                    <td>
                      <p className="an-product-name">{p.name}</p>
                      <p className="an-product-sku">{p.sku}</p>
                    </td>
                    <td className="an-td-strong">{fmt(p.revenue)}</td>
                    <td>{fmtNum(p.units_sold)}</td>
                    <td>{fmtNum(p.order_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── CATEGORY PERFORMANCE ── */}
      <div className="an-card">
        <SectionHead title="Category Performance" sub="Revenue and units sold per category" />
        {!catPerf.length ? (
          <p className="an-empty">No category sales data yet.</p>
        ) : (
          <table className="an-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Revenue</th>
                <th>Items Sold</th>
                <th>Orders</th>
                <th>Avg Order Value</th>
              </tr>
            </thead>
            <tbody>
              {catPerf.map(cat => (
                <tr key={cat.category_id}>
                  <td>
                    <p className="an-product-name">{cat.name}</p>
                    <p className="an-product-sku">{cat.full_path || cat.category_slug}</p>
                  </td>
                  <td className="an-td-strong">{fmt(cat.revenue)}</td>
                  <td>{fmtNum(cat.items_sold)}</td>
                  <td>{fmtNum(cat.order_count)}</td>
                  <td>{cat.order_count > 0 ? fmt(Number(cat.revenue) / Number(cat.order_count)) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── TWO COL: LOW STOCK + REVIEWS ── */}
      <div className="an-two-col">

        {/* Low stock */}
        <div className="an-card">
          <div className="an-sec-head-row">
            <SectionHead title="Low Stock" sub="Active products only" />
            <div className="an-threshold-row">
              <label className="an-threshold-label">Threshold</label>
              <input
                className="an-threshold-input"
                type="number"
                min="1"
                max="100"
                value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
              />
              <button className="an-chip active" onClick={reloadLowStock}>Apply</button>
            </div>
          </div>
          {!lowStock.length ? (
            <p className="an-empty">No variants below threshold {threshold}.</p>
          ) : (
            <table className="an-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Size</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map(v => (
                  <tr key={v.variant_id}>
                    <td>
                      <p className="an-product-name">{v.product_name}</p>
                      <p className="an-product-sku">{v.sku}</p>
                    </td>
                    <td>{v.size || <span className="an-muted">Unsized</span>}</td>
                    <td>
                      <span className={`an-stock-badge${v.stock_quantity === 0 ? ' an-stock-zero' : ''}`}>
                        {v.stock_quantity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Review stats */}
        <div className="an-card">
          <SectionHead title="Review Stats" />
          {!reviewStats ? (
            <p className="an-empty">No review data.</p>
          ) : (
            <>
              <div className="an-review-summary">
                <div className="an-review-avg">
                  <span className="an-review-avg-num">{reviewStats.summary?.avg_rating || '—'}</span>
                  <span className="an-review-avg-label">avg rating</span>
                </div>
                <div className="an-review-total">
                  <span className="an-review-total-num">{fmtNum(reviewStats.summary?.total_reviews)}</span>
                  <span className="an-review-total-label">total reviews</span>
                </div>
              </div>
              <div className="an-star-bars">
                {starKeys.map((key, i) => {
                  const count = reviewStats.summary?.[key] || 0;
                  const pct   = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={key} className="an-star-row">
                      <span className="an-star-label">{'★'.repeat(5 - i)}</span>
                      <div className="an-progress-track">
                        <div className="an-progress-bar an-progress-gold" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="an-star-count">{fmtNum(count)}</span>
                    </div>
                  );
                })}
              </div>

              {reviewStats.top_reviewed?.length > 0 && (
                <>
                  <p className="an-subsection-label">Most Reviewed</p>
                  <table className="an-table">
                    <thead>
                      <tr><th>Product</th><th>Reviews</th><th>Avg</th></tr>
                    </thead>
                    <tbody>
                      {reviewStats.top_reviewed.slice(0, 5).map(p => (
                        <tr key={p.product_id}>
                          <td><p className="an-product-name">{p.name}</p></td>
                          <td>{fmtNum(p.review_count)}</td>
                          <td className="an-td-strong">{'★'} {p.avg_rating}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .an-page {
          width: 100%;
          padding: 40px 48px 64px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: var(--bg-alt);
          min-height: 100vh;
        }
        .an-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .an-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: .22em;
          text-transform: uppercase; color: var(--gold); margin: 0 0 6px;
        }
        .an-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600; color: var(--dark); line-height: 1.1; margin: 0;
        }
        .an-error {
          padding: 12px 16px; background: #fff2f3; border: 1px solid #f5c2c7;
          color: #9f1239; border-radius: var(--r); font-size: 13.5px;
        }
        .an-loading {
          display: flex; flex-direction: column; align-items: center;
          gap: 14px; padding: 80px; color: var(--muted); font-size: 14px;
        }

        /* ── KPI STRIP ── */
        .an-kpi-strip {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
        }
        .an-kpi {
          background: var(--bg-card);
          padding: 20px 20px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .an-kpi-label {
          font-size: 10px; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; color: var(--muted); margin: 0;
        }
        .an-kpi-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px; font-weight: 700; color: var(--dark);
          line-height: 1; margin: 0;
        }
        .an-kpi-sub {
          font-size: 11.5px; color: var(--muted); margin: 0;
        }

        /* ── CARD ── */
        .an-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 28px 32px;
        }
        .an-sec-head { margin-bottom: 20px; }
        .an-sec-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 600; color: var(--dark); margin: 0 0 4px;
        }
        .an-sec-sub { font-size: 13px; color: var(--muted); margin: 0; }
        .an-sec-head-row {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 14px;
          margin-bottom: 20px; flex-wrap: wrap;
        }
        .an-sec-head-row .an-sec-head { margin-bottom: 0; }
        .an-empty {
          font-size: 13.5px; color: var(--muted);
          text-align: center; padding: 28px 0; margin: 0;
        }

        /* ── CHIPS ── */
        .an-chip-group { display: flex; gap: 4px; flex-wrap: wrap; }
        .an-chip {
          padding: 6px 12px; border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg); font-size: 12px; font-weight: 600;
          color: var(--muted); cursor: pointer; transition: all .2s;
          white-space: nowrap;
        }
        .an-chip:hover { border-color: var(--gold); color: var(--gold); }
        .an-chip.active {
          background: var(--dark); border-color: var(--dark); color: var(--gold);
        }
        .an-chip-sm { padding: 4px 10px; font-size: 11.5px; }

        /* ── SALES CONTROLS ── */
        .an-sales-controls {
          display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap;
        }
        .an-chart-loading {
          display: flex; align-items: center; gap: 10px;
          color: var(--muted); font-size: 13.5px; padding: 20px 0;
        }

        /* ── BAR CHART ── */
        .an-bar-chart {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 120px;
          margin-bottom: 8px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border);
          overflow: hidden;
        }
        .an-bar-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          gap: 4px;
          height: 100%;
          cursor: default;
          min-width: 0;
        }
        .an-bar {
          width: 100%;
          min-height: 4px;
          background: var(--gold);
          border-radius: 2px 2px 0 0;
          opacity: .8;
          transition: opacity .2s;
        }
        .an-bar-col:hover .an-bar { opacity: 1; }
        .an-bar-label {
          font-size: 9px; color: var(--muted);
          white-space: nowrap; transform: rotate(-30deg);
          transform-origin: top center; display: block;
        }
        .an-sales-table-wrap { margin-top: 16px; overflow-x: auto; }

        /* ── TABLE ── */
        .an-table {
          width: 100%; border-collapse: collapse;
        }
        .an-table thead th {
          padding: 10px 12px; text-align: left;
          font-size: 10px; font-weight: 700;
          letter-spacing: .1em; text-transform: uppercase;
          color: var(--muted); border-bottom: 1px solid var(--border);
        }
        .an-table tbody td {
          padding: 11px 12px; border-bottom: 1px solid var(--border);
          font-size: 13.5px; color: var(--text);
        }
        .an-table tbody tr:last-child td { border-bottom: none; }
        .an-table tbody tr { transition: background .15s; }
        .an-table tbody tr:hover { background: var(--bg); }
        .an-td-strong { font-weight: 700; color: var(--dark); }
        .an-rank {
          font-family: ui-monospace, monospace;
          font-size: 12px; color: var(--muted); font-weight: 700;
        }
        .an-product-name { font-weight: 600; color: var(--dark); margin: 0 0 2px; font-size: 13.5px; }
        .an-product-sku  { font-size: 11px; color: var(--muted); margin: 0; font-family: ui-monospace, monospace; }
        .an-muted { color: var(--muted); font-size: 13px; }

        /* ── STATUS ── */
        .an-status-list { display: flex; flex-direction: column; gap: 12px; }
        .an-status-row  { display: flex; flex-direction: column; gap: 5px; }
        .an-status-label-row {
          display: flex; align-items: center; gap: 8px; font-size: 13px;
        }
        .an-status-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }
        .an-status-name { flex: 1; color: var(--dark); font-weight: 500; text-transform: capitalize; }
        .an-status-count { font-weight: 700; color: var(--dark); }
        .an-status-pct   { color: var(--muted); font-size: 12px; min-width: 44px; text-align: right; }

        /* ── PROGRESS ── */
        .an-progress-track {
          height: 6px; background: var(--border);
          border-radius: 999px; overflow: hidden;
        }
        .an-progress-bar {
          height: 100%; border-radius: 999px;
          transition: width .4s var(--ease);
        }
        .an-progress-gold { background: var(--gold); }

        /* ── LOW STOCK ── */
        .an-threshold-row {
          display: flex; align-items: center; gap: 8px;
        }
        .an-threshold-label {
          font-size: 12px; color: var(--muted); font-weight: 600; white-space: nowrap;
        }
        .an-threshold-input {
          width: 64px; padding: 5px 8px;
          border: 1px solid var(--border); border-radius: calc(var(--r) - 2px);
          font-size: 13px; color: var(--dark); font-family: inherit;
          text-align: center;
        }
        .an-threshold-input:focus { outline: none; border-color: var(--gold); }
        .an-stock-badge {
          display: inline-flex; align-items: center; padding: 2px 10px;
          border-radius: 999px; font-size: 12px; font-weight: 700;
          background: #fff7e6; color: #b45309; border: 1px solid #fcd9a0;
        }
        .an-stock-zero { background: #fff2f3; color: #9f1239; border-color: #f5c2c7; }

        /* ── REVIEW STATS ── */
        .an-review-summary {
          display: flex; gap: 32px; margin-bottom: 16px;
        }
        .an-review-avg, .an-review-total {
          display: flex; flex-direction: column; align-items: center;
        }
        .an-review-avg-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 40px; font-weight: 700; color: var(--gold); line-height: 1;
        }
        .an-review-avg-label { font-size: 11px; color: var(--muted); font-weight: 600; }
        .an-review-total-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 40px; font-weight: 700; color: var(--dark); line-height: 1;
        }
        .an-review-total-label { font-size: 11px; color: var(--muted); font-weight: 600; }
        .an-star-bars { display: flex; flex-direction: column; gap: 7px; margin-bottom: 20px; }
        .an-star-row { display: flex; align-items: center; gap: 8px; }
        .an-star-label { font-size: 12px; color: #f0a500; min-width: 52px; }
        .an-star-count { font-size: 12px; color: var(--muted); min-width: 32px; text-align: right; }
        .an-subsection-label {
          font-size: 10px; font-weight: 700; letter-spacing: .12em;
          text-transform: uppercase; color: var(--muted);
          margin: 4px 0 10px;
        }

        /* ── TWO COL ── */
        .an-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

        /* ── SPINNER ── */
        @keyframes an-spin { to { transform: rotate(360deg); } }
        .an-spinner {
          display: inline-block; width: 14px; height: 14px;
          border: 2px solid rgba(196,146,42,.3);
          border-top-color: var(--gold); border-radius: 50%;
          animation: an-spin .7s linear infinite; flex-shrink: 0;
        }
        .an-spinner-lg { width: 32px; height: 32px; }

        /* ── RESPONSIVE ── */
        @media (max-width: 1200px) {
          .an-kpi-strip { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 900px) {
          .an-page { padding: 24px 20px 48px; }
          .an-kpi-strip { grid-template-columns: repeat(2, 1fr); }
          .an-two-col { grid-template-columns: 1fr; }
        }
        @media (max-width: 520px) {
          .an-kpi-strip { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default AdminAnalytics;