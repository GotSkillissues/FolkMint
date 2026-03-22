import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { reviewService } from '../services';

const Toast = ({ msg, type, onDismiss }) => {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);
  if (!msg) return null;
  return (
    <div className={`ar-toast ar-toast-${type}`}>
      {type === 'error'
        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      }
      {msg}
    </div>
  );
};

const Stars = ({ rating }) => (
  <span className="ar-stars">
    {[1, 2, 3, 4, 5].map(n => (
      <svg
        key={n}
        width="13" height="13"
        viewBox="0 0 24 24"
        fill={n <= rating ? '#f0a500' : 'none'}
        stroke="#f0a500"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ))}
  </span>
);

const AdminReviews = () => {
  const [reviews, setReviews]       = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [ratingFilter, setRatingFilter] = useState('all');
  const [loading, setLoading]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast]           = useState({ msg: '', type: 'success' });
  const loadMoreRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const showToast  = (msg, type = 'success') => setToast({ msg, type });
  const clearToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const loadReviews = useCallback(async (page = 1, rating = ratingFilter, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await reviewService.getAllReviews({
        page,
        limit: 15,
        rating: rating === 'all' ? undefined : rating,
      });
      const fetched = Array.isArray(res?.reviews) ? res.reviews : [];
      setReviews((prev) => {
        if (!append) return fetched;
        const seen = new Set(prev.map((r) => r.review_id));
        const next = fetched.filter((r) => !seen.has(r.review_id));
        return [...prev, ...next];
      });
      setPagination(res?.pagination || { page, pages: 1, total: fetched.length });
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to load reviews.', 'error');
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [ratingFilter]);

  useEffect(() => { loadReviews(); }, []); // eslint-disable-line

  const applyFilter = (rating) => {
    setRatingFilter(rating);
    loadReviews(1, rating);
  };

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        if (loading || loadingMore) return;
        if (pagination.page >= pagination.pages) return;
        loadReviews(pagination.page + 1, ratingFilter, true);
      },
      { rootMargin: '320px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadReviews, loading, loadingMore, pagination.page, pagination.pages, ratingFilter]);

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review? This cannot be undone.')) return;
    setDeletingId(reviewId);
    try {
      await reviewService.deleteReview(reviewId);
      showToast('Review deleted.');
      await loadReviews(1, ratingFilter);
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to delete review.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-BD', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <div className="ar-page">

      <div className="ar-head">
        <div>
          <p className="ar-eyebrow">Admin</p>
          <h1 className="ar-title">Reviews</h1>
        </div>
        <button
          className="ar-refresh-btn"
          onClick={() => loadReviews(pagination.page, ratingFilter)}
          disabled={loading}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      <Toast msg={toast.msg} type={toast.type} onDismiss={clearToast} />

      {/* Filter bar */}
      <div className="ar-filter-bar">
        <button
          className={`ar-filter-tab${ratingFilter === 'all' ? ' active' : ''}`}
          onClick={() => applyFilter('all')}
        >
          All
        </button>
        {[5, 4, 3, 2, 1].map(r => (
          <button
            key={r}
            className={`ar-filter-tab${ratingFilter === String(r) ? ' active' : ''}`}
            onClick={() => applyFilter(String(r))}
          >
            {'★'.repeat(r)} {r}
          </button>
        ))}
        <span className="ar-total-pill">{pagination.total} review{pagination.total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table card */}
      <div className="ar-table-card">
        {loading ? (
          <div className="ar-loading">
            <div className="ar-spinner ar-spinner-lg" /><p>Loading reviews…</p>
          </div>
        ) : !reviews.length ? (
          <div className="ar-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <p>No reviews found.</p>
          </div>
        ) : (
          <>
            <div className="ar-table-wrap">
              <table className="ar-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Reviewer</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map(review => (
                    <tr key={review.review_id}>

                      {/* Product */}
                      <td>
                        <Link
                          to={`/products/${review.product_id}`}
                          className="ar-product-link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {review.product_name || `Product #${review.product_id}`}
                        </Link>
                        {review.sku && <p className="ar-sku">{review.sku}</p>}
                      </td>

                      {/* Reviewer */}
                      <td>
                        <p className="ar-reviewer-name">
                          {review.first_name || review.last_name
                            ? `${review.first_name || ''} ${review.last_name || ''}`.trim()
                            : 'Anonymous'}
                        </p>
                        <p className="ar-reviewer-email">{review.email}</p>
                      </td>

                      {/* Rating */}
                      <td>
                        <Stars rating={review.rating} />
                        <p className="ar-rating-num">{review.rating}/5</p>
                      </td>

                      {/* Comment */}
                      <td>
                        {review.comment
                          ? <p className="ar-comment">{review.comment}</p>
                          : <span className="ar-no-comment">No comment</span>
                        }
                      </td>

                      {/* Date */}
                      <td>
                        <span className="ar-date">{fmtDate(review.created_at)}</span>
                      </td>

                      {/* Actions */}
                      <td>
                        <button
                          className="ar-delete-btn"
                          disabled={deletingId === review.review_id}
                          onClick={() => handleDelete(review.review_id)}
                        >
                          {deletingId === review.review_id
                            ? <span className="ar-spinner" />
                            : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div ref={loadMoreRef} className="ar-load-more" aria-hidden="true" />
            {loadingMore && <p className="ar-muted">Loading more reviews…</p>}
          </>
        )}
      </div>

      <style>{`
        .ar-page {
          width: 100%; padding: 40px 48px 64px;
          display: flex; flex-direction: column; gap: 16px;
          background: var(--bg-alt); min-height: 100vh;
        }
        .ar-head {
          display: flex; align-items: flex-end;
          justify-content: space-between; gap: 20px; margin-bottom: 4px;
        }
        .ar-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: .22em;
          text-transform: uppercase; color: var(--gold); margin: 0 0 6px;
        }
        .ar-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600; color: var(--dark); line-height: 1.1; margin: 0;
        }
        .ar-refresh-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: var(--r);
          font-size: 13px; font-weight: 600; color: var(--dark);
          cursor: pointer; transition: all .2s;
        }
        .ar-refresh-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
        .ar-refresh-btn:disabled { opacity: .5; cursor: not-allowed; }
        .ar-toast {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: var(--r);
          font-size: 13.5px; font-weight: 500; border: 1px solid;
          animation: ar-fade .2s ease;
        }
        @keyframes ar-fade { from { opacity: 0; transform: translateY(-6px); } }
        .ar-toast-success { background: #f0faf3; border-color: #bbe5c8; color: #156238; }
        .ar-toast-error   { background: #fff2f3; border-color: #f5c2c7; color: #9f1239; }
        .ar-filter-bar {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); padding: 12px 16px;
        }
        .ar-filter-tab {
          padding: 6px 14px; border-radius: 999px;
          border: 1px solid transparent; background: transparent;
          font-size: 12.5px; font-weight: 600; color: var(--muted);
          cursor: pointer; transition: all .2s;
        }
        .ar-filter-tab:hover { color: var(--dark); border-color: var(--border); }
        .ar-filter-tab.active { background: var(--dark); color: var(--gold); border-color: var(--dark); }
        .ar-total-pill { margin-left: auto; font-size: 12px; color: var(--muted); font-weight: 600; }
        .ar-table-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); overflow: hidden;
        }
        .ar-loading, .ar-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 14px; padding: 64px 24px; color: var(--muted); font-size: 14px;
        }
        .ar-table-wrap { overflow-x: auto; }
        .ar-table { width: 100%; border-collapse: collapse; min-width: 760px; }
        .ar-table thead th {
          padding: 13px 14px; text-align: left;
          font-size: 10px; font-weight: 700; letter-spacing: .12em;
          text-transform: uppercase; color: var(--muted);
          border-bottom: 1px solid var(--border); background: var(--bg-alt);
        }
        .ar-table tbody td {
          padding: 14px; border-bottom: 1px solid var(--border);
          vertical-align: top; font-size: 13.5px;
        }
        .ar-table tbody tr:last-child td { border-bottom: none; }
        .ar-table tbody tr { transition: background .2s; }
        .ar-table tbody tr:hover { background: var(--bg); }
        .ar-product-link {
          font-size: 13.5px; font-weight: 600; color: var(--gold);
          text-decoration: none; display: block; margin-bottom: 2px;
        }
        .ar-product-link:hover { color: var(--dark); }
        .ar-sku {
          font-family: ui-monospace, monospace;
          font-size: 11px; color: var(--muted); margin: 0;
        }
        .ar-reviewer-name {
          font-size: 13.5px; font-weight: 600; color: var(--dark); margin: 0 0 2px;
        }
        .ar-reviewer-email { font-size: 12px; color: var(--muted); margin: 0; }
        .ar-stars { display: flex; gap: 1px; }
        .ar-rating-num { font-size: 11px; color: var(--muted); margin: 3px 0 0; }
        .ar-comment {
          font-size: 13px; color: var(--text); line-height: 1.6;
          margin: 0; max-width: 280px;
          display: -webkit-box; -webkit-line-clamp: 3;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .ar-no-comment { font-size: 12px; color: var(--muted); font-style: italic; }
        .ar-date { font-size: 12.5px; color: var(--muted); white-space: nowrap; }
        .ar-delete-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 6px 14px; border-radius: calc(var(--r) - 2px);
          font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid;
          background: #fff2f3; border-color: #f5c2c7; color: #9f1239;
          transition: all .2s;
        }
        .ar-delete-btn:hover:not(:disabled) {
          background: #9f1239; border-color: #9f1239; color: #fff;
        }
        .ar-delete-btn:disabled { opacity: .4; cursor: not-allowed; }
        .ar-pagination {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; border-top: 1px solid var(--border);
        }
        .ar-muted { font-size: 13px; color: var(--muted); margin: 0; }
        .ar-pag-btns { display: flex; gap: 8px; }
        .ar-pag-btn {
          padding: 8px 18px; border-radius: var(--r);
          border: 1px solid var(--border); background: var(--bg-card);
          font-size: 13px; font-weight: 600; color: var(--dark); cursor: pointer; transition: all .2s;
        }
        .ar-pag-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
        .ar-pag-btn:disabled { opacity: .4; cursor: not-allowed; }
        @keyframes ar-spin { to { transform: rotate(360deg); } }
        .ar-spinner {
          display: inline-block; width: 13px; height: 13px;
          border: 2px solid rgba(196,146,42,.3); border-top-color: var(--gold);
          border-radius: 50%; animation: ar-spin .7s linear infinite; flex-shrink: 0;
        }
        .ar-spinner-lg { width: 28px; height: 28px; }
        @media (max-width: 860px) {
          .ar-page { padding: 24px 20px 48px; }
          .ar-head { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
};

export default AdminReviews;