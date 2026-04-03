import { useEffect, useState, useCallback, useRef } from 'react';
import { categoryService, productService } from '../services';

/* ─────────────────────────────────────────
   Tiny helpers
───────────────────────────────────────── */
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const unwrap = (res) => res?.data ?? res ?? {};

const normalizeCategories = (res) => {
  const payload = unwrap(res);
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload)) return payload;
  return [];
};

const normalizeProductsResponse = (res) => {
  const payload = unwrap(res);
  return {
    products: Array.isArray(payload?.products) ? payload.products : [],
    pagination: payload?.pagination || {},
  };
};

const normalizeVariantsResponse = (res) => {
  const payload = unwrap(res);
  return Array.isArray(payload?.variants) ? payload.variants : [];
};

const normalizeImagesResponse = (res) => {
  const payload = unwrap(res);
  return Array.isArray(payload?.images) ? payload.images : [];
};

const Toast = ({ msg, type, onDismiss }) => {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);

  if (!msg) return null;

  return (
    <div className={`ap-toast ap-toast-${type}`}>
      {type === 'error' ? (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ) : (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )}
      {msg}
    </div>
  );
};

/* Backend schema facts:
   - price lives on product (not variant)
   - variant columns: variant_id, product_id, size (nullable), stock_quantity
   - image columns: image_id, product_id, image_url, is_primary
   - backend createProduct defaults active unless is_active=false is explicitly sent
   - publishing is blocked by backend until at least one variant and one image exist
*/

const EMPTY_PRODUCT = { name: '', description: '', price: '', category_id: '', image_url: '', publish: false };
const EMPTY_VARIANT = { size: '', stock_quantity: '' };

/* ─────────────────────────────────────────
   Step indicator
───────────────────────────────────────── */
const StepDot = ({ num, active, done, label }) => (
  <div className="wiz-step-dot-wrap">
    <div className={`wiz-step-dot${active ? ' wiz-dot-active' : done ? ' wiz-dot-done' : ''}`}>
      {done ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : num}
    </div>
    <span className={`wiz-step-label${active ? ' wiz-step-label-active' : ''}`}>{label}</span>
  </div>
);

const StepBar = ({ step }) => (
  <div className="wiz-step-bar">
    <StepDot num={1} active={step === 1} done={step > 1} label="Category" />
    <div className={`wiz-step-line${step > 1 ? ' wiz-line-done' : ''}`} />
    <StepDot num={2} active={step === 2} done={step > 2} label="Subcategory" />
    <div className={`wiz-step-line${step > 2 ? ' wiz-line-done' : ''}`} />
    <StepDot num={3} active={step === 3} done={false} label="Product Info" />
  </div>
);

/* ─────────────────────────────────────────
   Create Wizard
───────────────────────────────────────── */
const CreateWizard = ({ categories, onComplete, onCancel, showToast }) => {
  const [step, setStep] = useState(1);

  // Step 1 state
  const [catMode, setCatMode] = useState(null); // 'existing' | 'new'
  const [selectedRootId, setSelectedRootId] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  // Step 2 state
  const [subMode, setSubMode] = useState(null); // 'existing' | 'new' | 'none'
  const [selectedSubId, setSelectedSubId] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');
  const [creatingSub, setCreatingSub] = useState(false);

  // Step 3 state
  const [product, setProduct] = useState({ name: '', description: '', price: '', stock: '10', image_url: '', image_file: null, publish: false });
  const [creating, setCreating] = useState(false);

  // Derived
  const rootCategories = categories.filter(c => !c.parent_category);
  const selectedRoot = categories.find(c => String(c.category_id) === String(selectedRootId));
  const subCategories = selectedRoot
    ? categories.filter(c => String(c.parent_category) === String(selectedRootId))
    : [];

  let finalCategoryId = '';
  if (catMode === 'new') {
    finalCategoryId = selectedRootId; 
  } else if (subMode === 'none') {
    finalCategoryId = selectedRootId;
  } else if (subMode === 'existing' || subMode === 'new') {
    finalCategoryId = selectedSubId || selectedRootId;
  } else {
    finalCategoryId = selectedRootId;
  }

  // Step 1 → 2
  const handleStep1Next = async () => {
    if (catMode === 'existing') {
      if (!selectedRootId) { showToast('Please select a category.', 'error'); return; }
      setStep(2);
    } else {
      if (!newCatName.trim()) { showToast('Category name is required.', 'error'); return; }
      setCreatingCat(true);
      try {
        const res = await categoryService.createCategory({ name: newCatName.trim(), description: newCatDesc.trim() || undefined });
        const newId = res?.data?.category?.category_id || res?.category?.category_id || res?.category_id;
        // Refresh categories list via reload—just use returned id if available or refetch
        // For now move to step 3 directly since new cat has no subs yet
        if (newId) setSelectedRootId(String(newId));
        showToast('Category created!');
        setStep(3); // New root category → skip subcategory step
      } catch (err) {
        showToast(err?.error || err?.message || 'Failed to create category.', 'error');
      } finally {
        setCreatingCat(false);
      }
    }
  };

  // Step 2 → 3
  const handleStep2Next = async () => {
    if (subMode === 'existing') {
      if (!selectedSubId) { showToast('Please select a subcategory.', 'error'); return; }
      setStep(3);
    } else if (subMode === 'new') {
      if (!newSubName.trim()) { showToast('Subcategory name is required.', 'error'); return; }
      setCreatingSub(true);
      try {
        const res = await categoryService.createCategory({
          name: newSubName.trim(),
          description: newSubDesc.trim() || undefined,
          parent_category: Number(selectedRootId),
        });
        const newId = res?.data?.category?.category_id || res?.category?.category_id || res?.category_id;
        if (newId) setSelectedSubId(String(newId));
        showToast('Subcategory created!');
        setStep(3);
      } catch (err) {
        showToast(err?.error || err?.message || 'Failed to create subcategory.', 'error');
      } finally {
        setCreatingSub(false);
      }
    } else {
      // 'none' — use root category directly
      setStep(3);
    }
  };

  // Final submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product.name.trim() || !product.price) {
      showToast('Name and price are required.', 'error'); return;
    }
    const priceNum = parseFloat(product.price);
    const stockNum = parseInt(product.stock, 10);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      showToast('Price must be a valid positive number.', 'error'); return;
    }
    if (Number.isNaN(stockNum) || stockNum < 0) {
      showToast('Stock quantity must be 0 or more.', 'error'); return;
    }
    if (!finalCategoryId) {
      showToast('No category selected. Go back and select a category.', 'error'); return;
    }
    setCreating(true);
    try {
      await onComplete({
        name: product.name.trim(),
        description: product.description.trim() || undefined,
        price: priceNum.toFixed(2),
        stock: stockNum,
        category_id: Number(finalCategoryId),
        image_url: product.image_url.trim() || null,
        image_file: product.image_file,
        publish: product.publish,
      });
    } finally {
      setCreating(false);
    }
  };

  const rootLabel = selectedRoot?.name || '—';
  const subLabel = categories.find(c => String(c.category_id) === String(selectedSubId))?.name;

  return (
    <div className="wiz-card">
      {/* Header breadcrumb */}
      <div className="wiz-header">
        <h3 className="ap-card-title" style={{ margin: 0 }}>New Product</h3>
        <button onClick={onCancel} className="wiz-close-btn" type="button" aria-label="Cancel">✕</button>
      </div>

      <StepBar step={step} />

      {/* Breadcrumb trail */}
      {step > 1 && (
        <div className="wiz-trail">
          <span className="wiz-trail-item">{catMode === 'new' ? `New: "${newCatName}"` : rootLabel}</span>
          {step > 2 && subLabel && <><span className="wiz-trail-sep">›</span><span className="wiz-trail-item">{subLabel}</span></>}
          {step > 2 && !subLabel && subMode === 'new' && <><span className="wiz-trail-sep">›</span><span className="wiz-trail-item">New: "{newSubName}"</span></>}
          {step > 2 && subMode === 'none' && <><span className="wiz-trail-sep">›</span><span className="wiz-trail-item wiz-trail-muted">No subcategory</span></>}
        </div>
      )}

      {/* ── STEP 1: Category ── */}
      {step === 1 && (
        <div className="wiz-step-body">
          <p className="wiz-step-title">Step 1 — Choose a Category</p>
          <p className="wiz-step-sub">Will this product go into an existing category, or do you need to create a new one?</p>

          <div className="wiz-choice-row">
            <button
              type="button"
              className={`wiz-choice-card${catMode === 'existing' ? ' wiz-choice-active' : ''}`}
              onClick={() => setCatMode('existing')}
            >
              <div className="wiz-choice-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v4H3z"/><path d="M3 10h18v4H3z"/><path d="M3 17h18v4H3z"/></svg>
              </div>
              <span className="wiz-choice-title">Existing Category</span>
              <span className="wiz-choice-sub">Pick from your current list</span>
            </button>
            <button
              type="button"
              className={`wiz-choice-card${catMode === 'new' ? ' wiz-choice-active' : ''}`}
              onClick={() => setCatMode('new')}
            >
              <div className="wiz-choice-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              </div>
              <span className="wiz-choice-title">New Category</span>
              <span className="wiz-choice-sub">Create a brand-new root category</span>
            </button>
          </div>

          {catMode === 'existing' && (
            <div className="wiz-field-group">
              <label className="ap-label">Root Category <span className="ap-req">*</span></label>
              <select className="ap-select" value={selectedRootId} onChange={e => setSelectedRootId(e.target.value)}>
                <option value="">Select category…</option>
                {rootCategories.map(c => (
                  <option key={c.category_id} value={c.category_id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {catMode === 'new' && (
            <div className="wiz-field-group">
              <label className="ap-label">Category Name <span className="ap-req">*</span></label>
              <input className="ap-input" placeholder="e.g. Footwear" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
              <label className="ap-label" style={{ marginTop: 10 }}>Description <span className="wiz-opt">(optional)</span></label>
              <input className="ap-input" placeholder="Short description" value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} />
            </div>
          )}

          <div className="wiz-foot">
            <button type="button" className="ap-btn-ghost" onClick={onCancel}>Cancel</button>
            <button type="button" className="ap-btn-primary" disabled={!catMode || creatingCat} onClick={handleStep1Next}>
              {creatingCat ? <><span className="ap-spinner" /> Creating…</> : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Subcategory ── */}
      {step === 2 && (
        <div className="wiz-step-body">
          <p className="wiz-step-title">Step 2 — Subcategory under <strong>{rootLabel}</strong></p>
          <p className="wiz-step-sub">Should this product go in a specific subcategory, a new one, or directly under {rootLabel}?</p>

          <div className="wiz-choice-row">
            <button type="button" className={`wiz-choice-card${subMode === 'existing' ? ' wiz-choice-active' : ''}`}
              onClick={() => setSubMode('existing')} disabled={subCategories.length === 0}
              title={subCategories.length === 0 ? 'No subcategories exist yet' : ''}>
              <div className="wiz-choice-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
              <span className="wiz-choice-title">Existing Sub</span>
              <span className="wiz-choice-sub">{subCategories.length > 0 ? `${subCategories.length} available` : 'None yet'}</span>
            </button>
            <button type="button" className={`wiz-choice-card${subMode === 'new' ? ' wiz-choice-active' : ''}`} onClick={() => setSubMode('new')}>
              <div className="wiz-choice-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              </div>
              <span className="wiz-choice-title">New Subcategory</span>
              <span className="wiz-choice-sub">Create under {rootLabel}</span>
            </button>
            <button type="button" className={`wiz-choice-card${subMode === 'none' ? ' wiz-choice-active' : ''}`} onClick={() => setSubMode('none')}>
              <div className="wiz-choice-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <span className="wiz-choice-title">No Subcategory</span>
              <span className="wiz-choice-sub">Place directly in {rootLabel}</span>
            </button>
          </div>

          {subMode === 'existing' && (
            <div className="wiz-field-group">
              <label className="ap-label">Subcategory <span className="ap-req">*</span></label>
              <select className="ap-select" value={selectedSubId} onChange={e => setSelectedSubId(e.target.value)}>
                <option value="">Select subcategory…</option>
                {subCategories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {subMode === 'new' && (
            <div className="wiz-field-group">
              <label className="ap-label">Subcategory Name <span className="ap-req">*</span></label>
              <input className="ap-input" placeholder={`e.g. Jamdani under ${rootLabel}`} value={newSubName} onChange={e => setNewSubName(e.target.value)} />
              <label className="ap-label" style={{ marginTop: 10 }}>Description <span className="wiz-opt">(optional)</span></label>
              <input className="ap-input" placeholder="Short description" value={newSubDesc} onChange={e => setNewSubDesc(e.target.value)} />
            </div>
          )}

          <div className="wiz-foot">
            <button type="button" className="ap-btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button type="button" className="ap-btn-primary" disabled={!subMode || creatingSub} onClick={handleStep2Next}>
              {creatingSub ? <><span className="ap-spinner" /> Creating…</> : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Product Details ── */}
      {step === 3 && (
        <div className="wiz-step-body">
          <p className="wiz-step-title">Step 3 — Product Details</p>
          <p className="wiz-step-sub">Fill in the product information. You can publish it immediately or save as draft.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="wiz-field-group">
              <div className="wiz-two-col">
                <div>
                  <label className="ap-label">Product Name <span className="ap-req">*</span></label>
                  <input className="ap-input" placeholder="e.g. Jamdani Saree" value={product.name}
                    onChange={e => setProduct(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
                    <div>
                      <label className="ap-label">Price (৳) <span className="ap-req">*</span></label>
                      <input className="ap-input" type="number" min="0" step="0.01" placeholder="0.00"
                        value={product.price} onChange={e => setProduct(p => ({ ...p, price: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="ap-label">Stock <span className="ap-req">*</span></label>
                      <input className="ap-input" type="number" min="0" placeholder="10"
                        value={product.stock} onChange={e => setProduct(p => ({ ...p, stock: e.target.value }))} required />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label className="ap-label">Description</label>
                <textarea className="ap-textarea" rows={3} placeholder="Short description of the product…"
                  value={product.description} onChange={e => setProduct(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div style={{ marginTop: 14 }}>
                <label className="ap-label">Image <span className="wiz-opt">(optional — upload a file OR paste a link)</span></label>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <label className="ap-btn-ghost" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    {product.image_file ? 'Change File' : 'Upload File'}
                    <input type="file" style={{ display: 'none' }} accept="image/jpeg,image/png,image/webp"
                      onChange={e => setProduct(p => ({ ...p, image_file: e.target.files[0], image_url: '' }))} />
                  </label>
                  <input className="ap-input" type="url" placeholder="OR paste https://... image URL"
                    value={product.image_url} style={{ flex: 1 }}
                    onChange={e => setProduct(p => ({ ...p, image_url: e.target.value, image_file: null }))} />
                </div>
                {product.image_file && <div style={{ fontSize: 12, marginTop: 6, color: 'var(--muted)' }}>Selected: {product.image_file.name}</div>}
                {!product.image_file && product.image_url && (
                  <img src={product.image_url} alt="Preview"
                    style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, marginTop: 10, border: '1px solid var(--border)' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                )}
              </div>

              <label className="wiz-publish-check" style={{ marginTop: 14 }}>
                <input type="checkbox" checked={product.publish}
                  onChange={e => setProduct(p => ({ ...p, publish: e.target.checked }))}
                  style={{ accentColor: 'var(--gold)', width: 15, height: 15 }} />
                <span>Publish immediately <span className="wiz-opt">(make visible to customers)</span></span>
              </label>
            </div>

            <div className="wiz-foot">
              <button type="button" className="ap-btn-ghost" onClick={() => setStep(catMode === 'new' ? 1 : 2)}>← Back</button>
              <button type="submit" className="ap-btn-primary" disabled={creating}>
                {creating ? <><span className="ap-spinner" /> Creating…</> : (product.publish ? '🚀 Create & Publish' : 'Create as Draft')}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .wiz-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); padding: 28px 32px;
          animation: ac-fade .2s ease; display: flex; flex-direction: column; gap: 0;
        }
        .wiz-header {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;
        }
        .wiz-close-btn {
          background: none; border: 1px solid var(--border); border-radius: 50%;
          width: 30px; height: 30px; cursor: pointer; color: var(--muted);
          display: flex; align-items: center; justify-content: center; font-size: 13px;
          transition: all .15s;
        }
        .wiz-close-btn:hover { color: #9f1239; border-color: #f5c2c7; }

        /* Step bar */
        .wiz-step-bar {
          display: flex; align-items: center; gap: 0; margin-bottom: 20px;
        }
        .wiz-step-dot-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .wiz-step-dot {
          width: 32px; height: 32px; border-radius: 50%;
          border: 2px solid var(--border); background: var(--bg-alt);
          color: var(--muted); font-size: 13px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; transition: all .25s;
        }
        .wiz-dot-active { border-color: var(--gold); background: var(--gold); color: var(--dark); }
        .wiz-dot-done { border-color: #15803d; background: #f0faf3; color: #15803d; }
        .wiz-step-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); white-space: nowrap; }
        .wiz-step-label-active { color: var(--gold); }
        .wiz-step-line { flex: 1; height: 2px; background: var(--border); margin: 0 8px; margin-bottom: 18px; transition: background .25s; }
        .wiz-line-done { background: #15803d; }

        /* Trail */
        .wiz-trail {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
          padding: 8px 14px; background: var(--bg-alt); border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px); margin-bottom: 20px;
          font-size: 12.5px; font-weight: 600; color: var(--dark);
        }
        .wiz-trail-item { padding: 2px 8px; background: var(--bg-card); border-radius: 999px; border: 1px solid var(--border); }
        .wiz-trail-muted { color: var(--muted); }
        .wiz-trail-sep { color: var(--muted); font-weight: 300; }

        /* Step body */
        .wiz-step-body { display: flex; flex-direction: column; gap: 16px; }
        .wiz-step-title { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 700; color: var(--dark); margin: 0; }
        .wiz-step-sub { font-size: 13px; color: var(--muted); margin: 0; line-height: 1.6; }

        /* Choice cards */
        .wiz-choice-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .wiz-choice-card {
          flex: 1 1 140px; padding: 18px 16px;
          border: 2px solid var(--border); border-radius: var(--r);
          background: var(--bg-alt); cursor: pointer; text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          transition: all .2s; color: var(--dark);
        }
        .wiz-choice-card:hover:not(:disabled) { border-color: var(--gold); background: var(--bg-card); }
        .wiz-choice-card.wiz-choice-active { border-color: var(--gold); background: rgba(196,146,42,.06); }
        .wiz-choice-card:disabled { opacity: .4; cursor: not-allowed; }
        .wiz-choice-icon { color: var(--gold); }
        .wiz-choice-title { font-size: 13.5px; font-weight: 700; color: var(--dark); }
        .wiz-choice-sub { font-size: 11.5px; color: var(--muted); }

        /* Fields */
        .wiz-field-group { display: flex; flex-direction: column; gap: 5px; background: var(--bg-alt); border: 1px solid var(--border); border-radius: var(--r); padding: 18px 20px; }
        .wiz-two-col { display: grid; grid-template-columns: 1fr 200px; gap: 14px; }
        .wiz-opt { font-weight: 400; font-size: 10px; color: var(--muted); text-transform: none; letter-spacing: 0; }
        .wiz-publish-check { display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--dark); cursor: pointer; }

        /* Footer */
        .wiz-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }

        @media (max-width: 640px) {
          .wiz-two-col { grid-template-columns: 1fr; }
          .wiz-choice-card { flex: 1 1 100%; }
          .wiz-card { padding: 20px 18px; }
        }
      `}</style>
    </div>
  );
};


/* ─────────────────────────────────────────
   Variant panel
───────────────────────────────────────── */
const VariantPanel = ({ productId, onToast }) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [newV, setNewV] = useState(EMPTY_VARIANT);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productService.getVariants(productId);
      const fetched = normalizeVariantsResponse(res);
      setVariants(fetched);

      const d = {};
      fetched.forEach((v) => {
        d[v.variant_id] = {
          size: v.size || '',
          stock_quantity: String(v.stock_quantity ?? 0),
        };
      });
      setDraft(d);
    } catch (err) {
      onToast(err?.error || err?.message || 'Failed to load variants.', 'error');
    } finally {
      setLoading(false);
    }
  }, [productId, onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const stock = Number(newV.stock_quantity);

    if (Number.isNaN(stock) || stock < 0) {
      onToast('Stock quantity must be 0 or more.', 'error');
      return;
    }

    setCreating(true);
    try {
      await productService.createVariant(productId, {
        size: newV.size.trim().toUpperCase() || null,
        stock_quantity: stock,
      });
      onToast('Variant added.');
      setNewV(EMPTY_VARIANT);
      await load();
    } catch (err) {
      onToast(err?.error || err?.message || 'Failed to add variant.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (variantId) => {
    const v = draft[variantId];
    const stock = Number(v.stock_quantity);

    if (Number.isNaN(stock) || stock < 0) {
      onToast('Stock must be 0 or more.', 'error');
      return;
    }

    setSavingId(variantId);
    try {
      await productService.updateVariant(variantId, {
        size: v.size.trim().toUpperCase() || null,
        stock_quantity: stock,
      });
      onToast('Variant updated.');
      await load();
    } catch (err) {
      onToast(err?.error || err?.message || 'Failed to update variant.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (variantId) => {
    if (!window.confirm('Delete this variant?')) return;

    setDeletingId(variantId);
    try {
      await productService.deleteVariant(variantId);
      onToast('Variant deleted.');
      await load();
    } catch (err) {
      onToast(err?.error || err?.message || 'Failed to delete variant.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const setField = (variantId, field, value) =>
    setDraft((prev) => ({
      ...prev,
      [variantId]: { ...prev[variantId], [field]: value },
    }));

  if (loading) {
    return (
      <div className="ap-variant-panel">
        <div className="ap-variant-loading">
          <div className="ap-spinner" /> Loading variants…
        </div>
      </div>
    );
  }

  return (
    <div className="ap-variant-panel">
      <form className="ap-variant-add-form" onSubmit={handleCreate}>
        <p className="ap-variant-form-label">Add Variant</p>
        <div className="ap-variant-add-row">
          <div className="ap-vfield">
            <label className="ap-vlabel">
              Size <span className="ap-vmuted">(optional)</span>
            </label>
            <input
              className="ap-vinput"
              placeholder="e.g. S, M, L, XL"
              value={newV.size}
              onChange={(e) => setNewV((p) => ({ ...p, size: e.target.value }))}
            />
          </div>

          <div className="ap-vfield">
            <label className="ap-vlabel">
              Stock <span className="ap-req">*</span>
            </label>
            <input
              className="ap-vinput"
              type="number"
              min="0"
              placeholder="0"
              value={newV.stock_quantity}
              onChange={(e) => setNewV((p) => ({ ...p, stock_quantity: e.target.value }))}
              required
            />
          </div>

          <button className="ap-variant-add-btn" type="submit" disabled={creating}>
            {creating ? (
              <>
                <span className="ap-spinner" /> Adding…
              </>
            ) : (
              '+ Add'
            )}
          </button>
        </div>
      </form>

      {!variants.length ? (
        <p className="ap-variant-empty">
          No variants loaded yet. Add a variant above, or refresh after product creation if the
          default unsized variant was auto-created by the database trigger.
        </p>
      ) : (
        <div className="ap-variant-list">
          <div className="ap-variant-list-head">
            <span>Size</span>
            <span>Stock</span>
            <span>Created</span>
            <span></span>
          </div>

          {variants.map((v) => {
            const d = draft[v.variant_id] || {};
            return (
              <div key={v.variant_id} className="ap-variant-row">
                <input
                  className="ap-vinput"
                  placeholder="Unsized"
                  value={d.size || ''}
                  onChange={(e) => setField(v.variant_id, 'size', e.target.value)}
                />

                <div className="ap-vstock-wrap">
                  <input
                    className={`ap-vinput${Number(d.stock_quantity) === 0 ? ' ap-vinput-zero' : ''}`}
                    type="number"
                    min="0"
                    value={d.stock_quantity ?? ''}
                    onChange={(e) => setField(v.variant_id, 'stock_quantity', e.target.value)}
                  />
                  {Number(d.stock_quantity) === 0 && (
                    <span className="ap-out-of-stock">Out of stock</span>
                  )}
                </div>

                <span className="ap-variant-created">{v.created_at ? fmtDate(v.created_at) : '—'}</span>

                <div className="ap-variant-actions">
                  <button
                    className="ap-vbtn ap-vbtn-save"
                    type="button"
                    disabled={savingId === v.variant_id}
                    onClick={() => handleSave(v.variant_id)}
                  >
                    {savingId === v.variant_id ? <span className="ap-spinner" /> : 'Save'}
                  </button>

                  <button
                    className="ap-vbtn ap-vbtn-delete"
                    type="button"
                    disabled={deletingId === v.variant_id}
                    onClick={() => handleDelete(v.variant_id)}
                  >
                    {deletingId === v.variant_id ? <span className="ap-spinner" /> : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────
   Image panel
───────────────────────────────────────── */
const ImagePanel = ({ productId, onToast }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState(null);
  const [deletingImg, setDeletingImg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productService.getImages(productId);
      setImages(normalizeImagesResponse(res));
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onToast('Only JPEG, PNG, and WebP images are supported.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onToast('Image must be under 5MB.', 'error');
      return;
    }

    setUploading(true);
    try {
      const uploadRes = await productService.uploadImage(file);
      const payload = unwrap(uploadRes);
      const imageUrl = payload?.image?.url || payload?.url || payload?.image_url;

      if (!imageUrl) throw new Error('No URL returned from upload.');

      await productService.addImage(productId, {
        image_url: imageUrl,
        is_primary: images.length === 0,
      });

      onToast('Image uploaded.');
      await load();
    } catch (err) {
      onToast(err?.error || err?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSetPrimary = async (imageId) => {
    setSettingPrimary(imageId);
    try {
      await productService.setPrimaryImage(imageId);
      onToast('Primary image updated.');
      await load();
    } catch (err) {
      onToast(err?.error || err?.message || 'Failed to set primary.', 'error');
    } finally {
      setSettingPrimary(null);
    }
  };

  const handleDeleteImg = async (imageId) => {
    if (!window.confirm('Delete this image?')) return;

    setDeletingImg(imageId);
    try {
      await productService.deleteImage(imageId);
      onToast('Image deleted.');
      await load();
    } catch (err) {
      onToast(err?.error || err?.message || 'Failed to delete image.', 'error');
    } finally {
      setDeletingImg(null);
    }
  };

  if (loading) {
    return (
      <div className="ap-image-panel">
        <div className="ap-variant-loading">
          <div className="ap-spinner" /> Loading images…
        </div>
      </div>
    );
  }

  return (
    <div className="ap-image-panel">
      <div className="ap-image-upload-row">
        <label className={`ap-upload-label${uploading ? ' uploading' : ''}`}>
          {uploading ? (
            <>
              <span className="ap-spinner" /> Uploading…
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Image
            </>
          )}

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>

        <span className="ap-upload-hint">
          JPEG, PNG or WebP · max 5 MB · first image auto-set as primary
        </span>
      </div>

      {!images.length ? (
        <p className="ap-variant-empty">No images yet. Upload one above.</p>
      ) : (
        <div className="ap-image-grid">
          {images.map((img) => (
            <div key={img.image_id} className={`ap-image-card${img.is_primary ? ' ap-image-primary' : ''}`}>
              <div className="ap-image-thumb-wrap">
                <img src={img.image_url} alt="" className="ap-image-thumb" />
                {img.is_primary && <span className="ap-primary-chip">Primary</span>}
              </div>

              <div className="ap-image-card-actions">
                {!img.is_primary && (
                  <button
                    className="ap-vbtn ap-vbtn-save"
                    type="button"
                    disabled={settingPrimary === img.image_id}
                    onClick={() => handleSetPrimary(img.image_id)}
                  >
                    {settingPrimary === img.image_id ? <span className="ap-spinner" /> : 'Set Primary'}
                  </button>
                )}

                <button
                  className="ap-vbtn ap-vbtn-delete"
                  type="button"
                  disabled={deletingImg === img.image_id}
                  onClick={() => handleDeleteImg(img.image_id)}
                >
                  {deletingImg === img.image_id ? <span className="ap-spinner" /> : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */
const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', category: '', sort: 'newest' });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);
  const [creating, setCreating] = useState(false);

  const [editDrafts, setEditDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [expandedId, setExpandedId] = useState(null);
  const [expandedPanel, setExpandedPanel] = useState(null); // 'variants' | 'images'
  const [publishingId, setPublishingId] = useState(null);

  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
  const clearToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    categoryService
      .getAllCategories()
      .then((res) => setCategories(normalizeCategories(res)))
      .catch(() => setCategories([]));
  }, []);

  const loadProducts = useCallback(
    async (page = 1, f = filters, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        // FIX: pass include_inactive=true so the backend returns both live and
        // draft products when called with an admin JWT. The backend's GET /products
        // route now uses optionalAuth, and the controller checks
        // req.user?.role === 'admin' before honouring this flag.
        const res = await productService.getAllProducts({
          page,
          limit: 12,
          search: f.search.trim() || undefined,
          category: f.category || undefined,
          sort: f.sort,
          include_inactive: 'true',
        });

        const { products: fetched, pagination: pg } = normalizeProductsResponse(res);

        setProducts((prev) => {
          if (!append) return fetched;
          const seen = new Set(prev.map((p) => p.product_id));
          const next = fetched.filter((p) => !seen.has(p.product_id));
          return [...prev, ...next];
        });
        setPagination({
          page: Number(pg.page) || page,
          pages: Number(pg.pages || pg.totalPages) || 1,
          total: Number(pg.total) || fetched.length,
        });

        setEditDrafts((prev) => {
          if (append) {
            const nextDrafts = { ...prev };
            fetched.forEach((p) => {
              if (!nextDrafts[p.product_id]) {
                nextDrafts[p.product_id] = {
                  name: p.name || '',
                  description: p.description || '',
                  price: p.price || '',
                  category_id: String(p.category_id || ''),
                };
              }
            });
            return nextDrafts;
          }

          const d = {};
          fetched.forEach((p) => {
            d[p.product_id] = {
              name: p.name || '',
              description: p.description || '',
              price: p.price || '',
              category_id: String(p.category_id || ''),
            };
          });
          return d;
        });
      } catch (err) {
        showToast(err?.error || err?.message || 'Failed to load products.', 'error');
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [filters, showToast]
  );

  useEffect(() => {
    loadProducts();
  }, []); // eslint-disable-line

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        if (loading || loadingMore) return;
        if (pagination.page >= pagination.pages) return;
        loadProducts(pagination.page + 1, filters, true);
      },
      { rootMargin: '320px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filters, loadProducts, loading, loadingMore, pagination.page, pagination.pages]);

  const handleWizardComplete = async (productData) => {
    setCreating(true);
    try {
      const res = await productService.createProduct({
        name: productData.name,
        description: productData.description,
        price: productData.price,
        category_id: productData.category_id,
        is_active: false,
      });

      const payload = unwrap(res);
      const createdId = payload?.product?.product_id;

      let finalImageUrl = productData.image_url;

      if (productData.image_file) {
        try {
          const uploadRes = await productService.uploadImage(productData.image_file);
          const uploadPayload = unwrap(uploadRes);
          // The backend returns { message: "...", image: { url: "..." } }
          finalImageUrl = uploadPayload?.image?.url || uploadPayload?.url || uploadPayload?.image_url || finalImageUrl;
        } catch (err) {
          showToast('Failed to upload image file.', 'error');
        }
      }

      if (createdId && finalImageUrl) {
        try {
          await productService.addImage(createdId, {
            image_url: finalImageUrl,
            is_primary: true,
          });
        } catch {
          showToast('Product created but image could not be saved.', 'error');
        }
      }

      if (createdId) {
        try {
          // The database trigger automatically creates a variant with stock=0
          // Wait briefly, fetch variants, and update the default variant's stock
          const variantRes = await productService.getVariants(createdId);
          const variants = unwrap(variantRes);
          // Check if payload wraps variants array
          const variantList = Array.isArray(variants) ? variants : (variants.variants || []);
          
          if (variantList && variantList.length > 0) {
            const defaultVariant = variantList[0];
            await productService.updateVariant(defaultVariant.variant_id, {
              stock_quantity: productData.stock
            });
          } else {
            // Fallback if trigger didn't run
            await productService.createVariant(createdId, { size: null, stock_quantity: productData.stock });
          }
        } catch { /* ignore if variant setup fails */ }
      }

      if (createdId && productData.publish) {
        try {
          await productService.updateProduct(createdId, { is_active: true });
        } catch {
          showToast('Product created but could not publish.', 'error');
        }
      }

      showToast(productData.publish ? 'Product created and published!' : 'Product created as draft.');
      setShowCreate(false);
      
      // We must reload categories just in case the wizard created a new one
      categoryService.getAllCategories().then(res => setCategories(normalizeCategories(res))).catch(() => {});
      await loadProducts(1, filters);

      if (createdId) {
        setExpandedId(createdId);
        setExpandedPanel('images');
      }
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to create product.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (productId) => {
    const d = editDrafts[productId];

    if (!d?.name?.trim() || !d.price || !d.category_id) {
      showToast('Name, price, and category are required.', 'error');
      return;
    }

    const priceNum = parseFloat(d.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      showToast('Price must be a valid positive number.', 'error');
      return;
    }

    setSavingId(productId);
    try {
      await productService.updateProduct(productId, {
        name: d.name.trim(),
        description: d.description.trim() || undefined,
        price: priceNum.toFixed(2),
        category_id: Number(d.category_id),
      });
      showToast('Product saved.');
      await loadProducts(1, filters);
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to save product.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleTogglePublish = async (product) => {
    setPublishingId(product.product_id);
    try {
      await productService.updateProduct(product.product_id, {
        is_active: !product.is_active,
      });
      showToast(product.is_active ? 'Product unpublished.' : 'Product published.');
      await loadProducts(1, filters);
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to update visibility.', 'error');
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Delete this product? If it has order history it will be hidden instead.')) {
      return;
    }

    setDeletingId(productId);
    try {
      await productService.deleteProduct(productId);
      showToast('Product deleted.');
      await loadProducts(1, filters);
      if (expandedId === productId) {
        setExpandedId(null);
        setExpandedPanel(null);
      }
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to delete product.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const togglePanel = (productId, panel) => {
    if (expandedId !== productId) {
      setExpandedId(productId);
      setExpandedPanel(panel);
      return;
    }

    if (panel === 'detail') {
      if (expandedPanel === 'detail') {
        setExpandedId(null);
        setExpandedPanel(null);
      } else {
        setExpandedPanel('detail');
      }
      return;
    }

    setExpandedPanel((prev) => (prev === panel ? 'detail' : panel));
  };

  const setDraftField = (productId, field, value) =>
    setEditDrafts((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));

  const applySearch = (e) => {
    e.preventDefault();
    loadProducts(1, filters);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length && products.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.product_id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} selected products?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => productService.deleteProduct(id)));
      showToast(`${selectedIds.size} products deleted.`);
      setSelectedIds(new Set());
      await loadProducts(1, filters);
      setExpandedId(null);
      setExpandedPanel(null);
    } catch (err) {
      showToast('Finished with errors. Some products might not be deleted.', 'error');
      await loadProducts(1, filters);
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="ap-page">
      <div className="ap-head">
        <div>
          <p className="ap-eyebrow">Admin</p>
          <h1 className="ap-title">Products</h1>
        </div>

        <button className="ap-create-btn" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? (
            'Cancel'
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Product
            </>
          )}
        </button>
      </div>

      <Toast msg={toast.msg} type={toast.type} onDismiss={clearToast} />

      {showCreate && (
        <CreateWizard
          categories={categories}
          onComplete={handleWizardComplete}
          onCancel={() => setShowCreate(false)}
          showToast={showToast}
        />
      )}

      <div className="ap-filters-card">
        <form className="ap-filters" onSubmit={applySearch}>
          <input
            className="ap-input ap-input-search"
            placeholder="Search products…"
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          />

          <select
            className="ap-select"
            value={filters.category}
            onChange={(e) => {
              const f = { ...filters, category: e.target.value };
              setFilters(f);
              loadProducts(1, f);
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="ap-select"
            value={filters.sort}
            onChange={(e) => {
              const f = { ...filters, sort: e.target.value };
              setFilters(f);
              loadProducts(1, f);
            }}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
            <option value="price_asc">Price Low–High</option>
            <option value="price_desc">Price High–Low</option>
          </select>

          <button className="ap-btn-primary" type="submit">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <p className="ap-count">
            {pagination.total} product{pagination.total !== 1 ? 's' : ''}
          </p>
          {selectedIds.size > 0 && (
            <button
              className="ap-action-btn ap-action-delete"
              style={{ padding: '6px 12px', background: 'var(--bg-card)', borderColor: '#fecaca', color: '#dc2626' }}
              type="button"
              disabled={bulkDeleting}
              onClick={handleBulkDelete}
            >
              {bulkDeleting ? <span className="ap-spinner" /> : `Delete Selected (${selectedIds.size})`}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="ap-loading">
          <div className="ap-spinner ap-spinner-lg" />
          <p>Loading products…</p>
        </div>
      ) : !products.length ? (
        <div className="ap-empty">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          >
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <p>No products found.</p>
        </div>
      ) : (
        <div className="ap-product-list">
          <div className="ap-list-row" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '12px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
            <div className="ap-col" style={{ flex: '0 0 auto', paddingRight: '12px', display: 'flex', alignItems: 'center' }}>
              <input 
                type="checkbox" 
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--gold)' }}
                checked={products.length > 0 && selectedIds.size === products.length}
                onChange={toggleSelectAll}
                title="Select All"
              />
            </div>
            <div className="ap-col ap-col-name" style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</div>
            <div className="ap-col ap-col-category" style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</div>
            <div className="ap-col ap-col-stock" style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock</div>
            <div className="ap-col ap-col-price" style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</div>
            <div className="ap-col ap-col-actions" style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</div>
          </div>
          {products.map((product) => {
            const d = editDrafts[product.product_id] || {};
            const isExpandedVariants = expandedId === product.product_id && expandedPanel === 'variants';
            const isExpandedImages = expandedId === product.product_id && expandedPanel === 'images';
            const isExpandedDetail = expandedId === product.product_id;

            const primaryImage = product.primary_image || product.image_url || null;

            return (
              <div
                key={product.product_id}
                className={`ap-product-card${!product.is_active ? ' ap-product-inactive' : ''}${selectedIds.has(product.product_id) ? ' ap-product-selected' : ''}`}
                style={selectedIds.has(product.product_id) ? { backgroundColor: 'rgba(196,146,42,0.05)' } : {}}
              >
                <div className="ap-list-row">
                  <div className="ap-col" style={{ flex: '0 0 auto', paddingRight: '12px', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--gold)' }}
                      checked={selectedIds.has(product.product_id)}
                      onChange={() => toggleSelectOne(product.product_id)}
                    />
                  </div>
                  <div className="ap-col ap-col-name">
                    <div className="ap-list-name-wrap">
                      <div className="ap-product-thumb ap-product-thumb-sm">
                        {primaryImage ? (
                          <img src={primaryImage} alt={product.name} />
                        ) : (
                          <div className="ap-thumb-placeholder">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="ap-list-name">{product.name}</p>
                        <p className="ap-list-sub">{product.sku || 'No SKU'} · Added {fmtDate(product.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="ap-col ap-col-category">{product.category_name || 'Uncategorized'}</div>

                  <div className="ap-col ap-col-stock">
                    <span className={`ap-stock-val${(product.total_stock || 0) === 0 ? ' ap-stock-zero' : ''}`}>
                      {product.total_stock ?? 0}
                    </span>
                  </div>

                  <div className="ap-col ap-col-price">৳{Number(product.price || 0).toLocaleString('en-BD')}</div>

                  <div className="ap-col ap-col-actions">
                    <button
                      className={`ap-action-btn ap-action-panel${isExpandedDetail ? ' active' : ''}`}
                      type="button"
                      onClick={() => togglePanel(product.product_id, 'detail')}
                    >
                      {isExpandedDetail ? 'Close' : 'View & Edit'}
                    </button>
                  </div>
                </div>

                {isExpandedDetail && (
                  <div className="ap-detail-panel">
                    <div className="ap-product-fields">
                      <div className="ap-product-fields-top">
                        <div className="ap-field ap-field-grow">
                          <label className="ap-label">Name</label>
                          <input
                            className="ap-input"
                            value={d.name || ''}
                            onChange={(e) => setDraftField(product.product_id, 'name', e.target.value)}
                          />
                        </div>

                        <div className="ap-field ap-field-price">
                          <label className="ap-label">Price (৳)</label>
                          <input
                            className="ap-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={d.price || ''}
                            onChange={(e) => setDraftField(product.product_id, 'price', e.target.value)}
                          />
                        </div>

                        <div className="ap-field ap-field-cat">
                          <label className="ap-label">Category</label>
                          <select
                            className="ap-select"
                            value={d.category_id || ''}
                            onChange={(e) => setDraftField(product.product_id, 'category_id', e.target.value)}
                          >
                            <option value="">Select…</option>
                            {categories.map((c) => (
                              <option key={c.category_id} value={c.category_id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="ap-field">
                        <label className="ap-label">Description</label>
                        <textarea
                          className="ap-textarea ap-textarea-sm"
                          rows={2}
                          value={d.description || ''}
                          onChange={(e) => setDraftField(product.product_id, 'description', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="ap-product-actions ap-product-actions-inline">
                      <button
                        className={`ap-publish-btn${product.is_active ? ' ap-publish-active' : ''}`}
                        type="button"
                        disabled={publishingId === product.product_id}
                        onClick={() => handleTogglePublish(product)}
                        title={product.is_active ? 'Click to unpublish' : 'Click to publish (requires at least one variant and one image)'}
                      >
                        {publishingId === product.product_id ? <span className="ap-spinner" /> : (product.is_active ? 'Live' : 'Draft')}
                      </button>

                      <button
                        className="ap-action-btn ap-action-save"
                        type="button"
                        disabled={savingId === product.product_id}
                        onClick={() => handleSave(product.product_id)}
                      >
                        {savingId === product.product_id ? <span className="ap-spinner" /> : 'Save Changes'}
                      </button>

                      <button
                        className={`ap-action-btn ap-action-panel${isExpandedVariants ? ' active' : ''}`}
                        type="button"
                        onClick={() => togglePanel(product.product_id, 'variants')}
                      >
                        Variants
                      </button>

                      <button
                        className={`ap-action-btn ap-action-panel${isExpandedImages ? ' active' : ''}`}
                        type="button"
                        onClick={() => togglePanel(product.product_id, 'images')}
                      >
                        Images
                      </button>

                      <button
                        className="ap-action-btn ap-action-delete"
                        type="button"
                        disabled={deletingId === product.product_id}
                        onClick={() => handleDelete(product.product_id)}
                      >
                        {deletingId === product.product_id ? <span className="ap-spinner" /> : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}

                {isExpandedVariants && (
                  <VariantPanel productId={product.product_id} onToast={showToast} />
                )}

                {isExpandedImages && (
                  <ImagePanel productId={product.product_id} onToast={showToast} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && products.length > 0 && (
        <>
          <div ref={loadMoreRef} className="ap-load-more" aria-hidden="true" />
          {loadingMore && <p className="ap-muted">Loading more products…</p>}
        </>
      )}

      <style>{`
        .ap-page {
          width: 100%;
          padding: 40px 48px 64px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: var(--bg-alt);
          min-height: 100vh;
        }

        .ap-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 4px;
        }
        .ap-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--gold);
          margin: 0 0 6px;
        }
        .ap-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600;
          color: var(--dark);
          line-height: 1.1;
          margin: 0;
        }
        .ap-create-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 22px;
          background: var(--dark);
          color: var(--gold);
          border: none;
          border-radius: var(--r);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .06em;
          cursor: pointer;
          transition: background .2s;
          white-space: nowrap;
        }
        .ap-create-btn:hover { background: var(--black); }

        .ap-toast {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: var(--r);
          font-size: 13.5px;
          font-weight: 500;
          border: 1px solid;
          animation: ap-fade .2s ease;
        }
        @keyframes ap-fade { from { opacity: 0; transform: translateY(-6px); } }
        .ap-toast-success { background: #f0faf3; border-color: #bbe5c8; color: #156238; }
        .ap-toast-error   { background: #fff2f3; border-color: #f5c2c7; color: #9f1239; }

        .ap-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .ap-req { color: #b91c1c; margin-left: 2px; }

        .ap-input {
          padding: 9px 13px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px);
          font-size: 13.5px;
          color: var(--dark);
          font-family: inherit;
          box-sizing: border-box;
          width: 100%;
          transition: border-color .2s, box-shadow .2s;
        }
        .ap-input:focus {
          outline: none;
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(196,146,42,.1);
        }
        .ap-input-search { max-width: 320px; }

        .ap-textarea {
          padding: 9px 13px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px);
          font-size: 13.5px;
          color: var(--dark);
          font-family: inherit;
          box-sizing: border-box;
          width: 100%;
          resize: vertical;
          line-height: 1.6;
          transition: border-color .2s;
        }
        .ap-textarea:focus { outline: none; border-color: var(--gold); }
        .ap-textarea-sm { min-height: 56px; }

        .ap-select {
          padding: 9px 13px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px);
          font-size: 13.5px;
          color: var(--dark);
          font-family: inherit;
          cursor: pointer;
          box-sizing: border-box;
          width: 100%;
        }
        .ap-select:focus { outline: none; border-color: var(--gold); }

        .ap-field { display: flex; flex-direction: column; gap: 5px; }
        .ap-field-grow { flex: 1 1 220px; }
        .ap-field-price { flex: 0 0 130px; }
        .ap-field-cat { flex: 0 0 180px; }

        .ap-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 22px;
          background: var(--dark);
          color: var(--gold);
          border: none;
          border-radius: var(--r);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .06em;
          cursor: pointer;
          white-space: nowrap;
          transition: background .2s;
        }
        .ap-btn-primary:hover:not(:disabled) { background: var(--black); }
        .ap-btn-primary:disabled { opacity: .5; cursor: not-allowed; }

        .ap-create-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 28px 32px;
          animation: ap-fade .2s ease;
        }
        .ap-card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--dark);
          margin: 0 0 6px;
        }
        .ap-card-hint {
          font-size: 13px;
          color: var(--muted);
          margin: 0 0 20px;
          line-height: 1.6;
        }
        .ap-create-form { display: flex; flex-direction: column; gap: 14px; }
        .ap-create-row { display: flex; gap: 14px; flex-wrap: wrap; }
        .ap-create-row-main { align-items: flex-end; }
        .ap-create-foot { display: flex; justify-content: flex-end; }

        .ap-filters-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }
        .ap-filters {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          flex: 1;
        }
        .ap-count {
          font-size: 13px;
          color: var(--muted);
          white-space: nowrap;
          margin: 0;
        }

        .ap-loading, .ap-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 64px 24px;
          color: var(--muted);
          font-size: 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
        }

        .ap-product-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ap-list-row {
          display: grid;
          grid-template-columns: minmax(280px, 2.4fr) minmax(140px, 1.2fr) 90px 120px 140px;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
        }
        .ap-col { min-width: 0; }
        .ap-col-category,
        .ap-col-stock,
        .ap-col-price {
          font-size: 13.5px;
          color: var(--dark);
          font-weight: 500;
        }
        .ap-col-stock { text-align: center; }
        .ap-col-price { white-space: nowrap; }
        .ap-col-actions {
          display: flex;
          justify-content: flex-end;
        }

        .ap-list-name-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .ap-product-thumb-sm {
          width: 54px;
          height: 54px;
          border-right: none;
          border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px);
          overflow: hidden;
        }
        .ap-list-name {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: var(--dark);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ap-list-sub {
          margin: 2px 0 0;
          font-size: 11.5px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ap-detail-panel {
          border-top: 1px solid var(--border);
          padding: 16px;
          background: #fffbf0;
          animation: ap-fade .2s ease;
        }
        .ap-product-actions-inline {
          margin-top: 12px;
          flex-direction: row;
          flex-wrap: wrap;
        }

        .ap-product-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
          transition: box-shadow .2s;
        }
        .ap-product-card:hover { box-shadow: var(--sh-md); }
        .ap-product-inactive {
          opacity: .72;
          border-style: dashed;
        }

        .ap-product-row {
          display: flex;
          gap: 0;
          align-items: stretch;
        }

        .ap-product-thumb {
          width: 90px;
          flex-shrink: 0;
          background: var(--bg-alt);
          border-right: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .ap-product-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .ap-thumb-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: var(--muted);
          min-height: 80px;
        }

        .ap-product-fields {
          flex: 1;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-right: 1px solid var(--border);
        }
        .ap-product-fields-top {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: flex-end;
        }

        .ap-product-meta {
          width: 220px;
          flex-shrink: 0;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 14px;
        }
        .ap-product-meta-top {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ap-meta-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 2px;
        }
        .ap-meta-val {
          font-size: 13px;
          color: var(--dark);
        }
        .ap-sku-val {
          font-family: ui-monospace, monospace;
          font-size: 12.5px;
          color: var(--dark);
        }
        .ap-stock-val {
          font-size: 18px;
          font-weight: 700;
          color: #15803d;
        }
        .ap-stock-zero { color: #dc2626; }
        .ap-product-sku, .ap-product-stock { display: flex; flex-direction: column; }

        .ap-product-actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ap-publish-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 14px;
          border-radius: calc(var(--r) - 2px);
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: .06em;
          cursor: pointer;
          border: 1px solid;
          transition: all .2s;
          background: #fff2f3;
          border-color: #f5c2c7;
          color: #9f1239;
        }
        .ap-publish-btn.ap-publish-active {
          background: #f0faf3;
          border-color: #bbe5c8;
          color: #15803d;
        }
        .ap-publish-btn:disabled { opacity: .5; cursor: not-allowed; }

        .ap-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 7px 14px;
          border-radius: calc(var(--r) - 2px);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .04em;
          cursor: pointer;
          border: 1px solid;
          transition: all .2s;
          white-space: nowrap;
        }
        .ap-action-btn:disabled { opacity: .4; cursor: not-allowed; }

        .ap-action-save {
          background: var(--dark);
          border-color: var(--dark);
          color: var(--gold);
        }
        .ap-action-save:hover:not(:disabled) {
          background: var(--black);
          border-color: var(--black);
        }

        .ap-action-panel {
          background: var(--bg);
          border-color: var(--border);
          color: var(--dark);
        }
        .ap-action-panel:hover,
        .ap-action-panel.active {
          border-color: var(--gold);
          color: var(--gold);
          background: #fffbf0;
        }

        .ap-action-delete {
          background: #fff2f3;
          border-color: #f5c2c7;
          color: #9f1239;
        }
        .ap-action-delete:hover:not(:disabled) {
          background: #9f1239;
          border-color: #9f1239;
          color: #fff;
        }

        .ap-variant-panel {
          border-top: 1px solid var(--border);
          background: #fffbf0;
          padding: 20px 24px;
          animation: ap-fade .2s ease;
        }
        .ap-variant-loading {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          color: var(--muted);
        }
        .ap-variant-form-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--muted);
          margin: 0 0 10px;
        }
        .ap-variant-add-row {
          display: flex;
          gap: 10px;
          align-items: flex-end;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .ap-vfield { display: flex; flex-direction: column; gap: 4px; }
        .ap-vlabel {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .ap-vmuted { font-weight: 400; text-transform: none; letter-spacing: 0; }

        .ap-vinput {
          padding: 8px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px);
          font-size: 13px;
          color: var(--dark);
          font-family: inherit;
          box-sizing: border-box;
          width: 100%;
          transition: border-color .2s;
        }
        .ap-vinput:focus { outline: none; border-color: var(--gold); }
        .ap-vinput-zero { border-color: #fca5a5; background: #fff5f5; }

        .ap-variant-add-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 18px;
          background: var(--dark);
          color: var(--gold);
          border: none;
          border-radius: calc(var(--r) - 2px);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: background .2s;
          align-self: flex-end;
        }
        .ap-variant-add-btn:hover:not(:disabled) { background: var(--black); }
        .ap-variant-add-btn:disabled { opacity: .5; cursor: not-allowed; }

        .ap-variant-empty {
          font-size: 13px;
          color: var(--muted);
          line-height: 1.65;
          margin: 0;
        }

        .ap-variant-list {
          border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px);
          overflow: hidden;
          background: var(--bg-card);
        }
        .ap-variant-list-head {
          display: grid;
          grid-template-columns: 160px 160px 1fr auto;
          gap: 12px;
          padding: 10px 14px;
          background: var(--bg-alt);
          border-bottom: 1px solid var(--border);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .ap-variant-row {
          display: grid;
          grid-template-columns: 160px 160px 1fr auto;
          gap: 12px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          align-items: center;
          transition: background .2s;
        }
        .ap-variant-row:last-child { border-bottom: none; }
        .ap-variant-row:hover { background: var(--bg); }

        .ap-vstock-wrap { display: flex; flex-direction: column; gap: 3px; }
        .ap-out-of-stock {
          font-size: 10px;
          font-weight: 700;
          color: #dc2626;
          letter-spacing: .04em;
        }
        .ap-variant-created {
          font-size: 12px;
          color: var(--muted);
        }

        .ap-variant-actions { display: flex; gap: 6px; }
        .ap-vbtn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: calc(var(--r) - 2px);
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid;
          transition: all .2s;
          white-space: nowrap;
        }
        .ap-vbtn:disabled { opacity: .4; cursor: not-allowed; }

        .ap-vbtn-save {
          background: var(--dark);
          border-color: var(--dark);
          color: var(--gold);
        }
        .ap-vbtn-save:hover:not(:disabled) {
          background: var(--black);
          border-color: var(--black);
        }

        .ap-vbtn-delete {
          background: #fff2f3;
          border-color: #f5c2c7;
          color: #9f1239;
        }
        .ap-vbtn-delete:hover:not(:disabled) {
          background: #9f1239;
          border-color: #9f1239;
          color: #fff;
        }

        .ap-image-panel {
          border-top: 1px solid var(--border);
          background: #fffbf0;
          padding: 20px 24px;
          animation: ap-fade .2s ease;
        }
        .ap-image-upload-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .ap-upload-label {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          background: var(--dark);
          color: var(--gold);
          border-radius: calc(var(--r) - 2px);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background .2s;
          white-space: nowrap;
        }
        .ap-upload-label:hover:not(.uploading) { background: var(--black); }
        .ap-upload-label.uploading { opacity: .7; cursor: not-allowed; }
        .ap-upload-hint {
          font-size: 12px;
          color: var(--muted);
        }

        .ap-image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        }
        .ap-image-card {
          border: 1px solid var(--border);
          border-radius: calc(var(--r) - 2px);
          overflow: hidden;
          background: var(--bg-card);
          transition: box-shadow .2s;
        }
        .ap-image-card:hover { box-shadow: var(--sh-md); }
        .ap-image-primary { border-color: var(--gold); border-width: 2px; }

        .ap-image-thumb-wrap {
          position: relative;
          aspect-ratio: 4/5;
          background: var(--bg-alt);
          overflow: hidden;
        }
        .ap-image-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .ap-primary-chip {
          position: absolute;
          top: 6px;
          left: 6px;
          padding: 2px 8px;
          background: var(--gold);
          color: var(--dark);
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .ap-image-card-actions {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px;
        }

        .ap-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r);
        }
        .ap-muted { font-size: 13px; color: var(--muted); margin: 0; }
        .ap-pag-btns { display: flex; gap: 8px; }
        .ap-pag-btn {
          padding: 8px 18px;
          border-radius: var(--r);
          border: 1px solid var(--border);
          background: var(--bg-card);
          font-size: 13px;
          font-weight: 600;
          color: var(--dark);
          cursor: pointer;
          transition: all .2s;
        }
        .ap-pag-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
        .ap-pag-btn:disabled { opacity: .4; cursor: not-allowed; }

        @keyframes ap-spin { to { transform: rotate(360deg); } }
        .ap-spinner {
          display: inline-block;
          width: 13px;
          height: 13px;
          border: 2px solid rgba(196,146,42,.3);
          border-top-color: var(--gold);
          border-radius: 50%;
          animation: ap-spin .7s linear infinite;
          flex-shrink: 0;
        }
        .ap-spinner-lg { width: 28px; height: 28px; }

        @media (max-width: 1100px) {
          .ap-page { padding: 32px 28px 56px; }
          .ap-product-meta { width: 180px; }
        }
        @media (max-width: 860px) {
          .ap-page { padding: 24px 20px 48px; }
          .ap-head { flex-direction: column; align-items: flex-start; }
          .ap-list-row {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .ap-col-actions { justify-content: flex-start; }
          .ap-product-row { flex-direction: column; }
          .ap-product-thumb {
            width: 100%;
            height: 160px;
            border-right: none;
            border-bottom: 1px solid var(--border);
          }
          .ap-product-meta {
            width: 100%;
            border-top: 1px solid var(--border);
          }
          .ap-product-meta-top { flex-direction: row; gap: 20px; }
          .ap-product-actions { flex-direction: row; flex-wrap: wrap; }
          .ap-variant-list-head,
          .ap-variant-row { grid-template-columns: 120px 120px 1fr auto; }
        }
        @media (max-width: 560px) {
          .ap-filters { flex-direction: column; align-items: stretch; }
          .ap-input-search { max-width: 100%; }
          .ap-variant-list-head { display: none; }
          .ap-variant-row { grid-template-columns: 1fr 1fr; gap: 8px; }
          .ap-variant-created { display: none; }
        }
      `}</style>
    </div>
  );
};

export default AdminProducts;