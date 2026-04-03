import { useEffect, useState, useCallback } from 'react';
import { categoryService } from '../services';

const Toast = ({ msg, type, onDismiss }) => {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);
  if (!msg) return null;
  return (
    <div className={`ac-toast ac-toast-${type}`}>
      {type === 'error'
        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      }
      {msg}
    </div>
  );
};

const EMPTY_NEW = { name: '', description: '', parent_category: '', sort_order: '' };

/* Flatten the tree for the parent dropdown */
const flattenTree = (nodes, depth = 0) => {
  const out = [];
  for (const node of nodes) {
    out.push({ ...node, depth });
    if (Array.isArray(node.children) && node.children.length) {
      out.push(...flattenTree(node.children, depth + 1));
    }
  }
  return out;
};

/* Recursive category row */
const CategoryRow = ({ node, depth, flatList, onSave, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing]   = useState(false);
  // FIX: initialise is_active in draft state so the toggle has a value to read/write
  const [draft, setDraft]       = useState({
    name:            node.name || '',
    description:     node.description || '',
    parent_category: node.parent_category != null ? String(node.parent_category) : '',
    sort_order:      node.sort_order != null ? String(node.sort_order) : '',
    is_active:       node.is_active !== false,
  });
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);

  const children = Array.isArray(node.children) ? node.children : [];

  const handleSave = async () => {
    setSaving(true);
    await onSave(node.category_id, draft);
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`WARNING: Deleting "${node.name}" will also permanently delete ALL of its subcategories and ALL products contained within them. Do you wish to continue?`)) return;
    setDeleting(true);
    await onDelete(node.category_id);
    setDeleting(false);
  };

  return (
    <>
      <div className="ac-cat-row" style={{ paddingLeft: `${16 + depth * 24}px` }}>
        <div className="ac-cat-indent-line" style={{ left: `${4 + depth * 24}px` }} />

        {editing ? (
          <div className="ac-cat-edit-form">
            <input
              className="ac-input"
              placeholder="Category name *"
              value={draft.name}
              onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
            />
            <input
              className="ac-input"
              placeholder="Description"
              value={draft.description}
              onChange={e => setDraft(p => ({ ...p, description: e.target.value }))}
            />
            <select
              className="ac-select"
              value={draft.parent_category}
              onChange={e => setDraft(p => ({ ...p, parent_category: e.target.value }))}
            >
              <option value="">No parent (root)</option>
              {flatList
                .filter(c => c.category_id !== node.category_id)
                .map(c => (
                  <option key={c.category_id} value={c.category_id}>
                    {'—'.repeat(c.depth)} {c.name}
                  </option>
                ))
              }
            </select>
            <input
              className="ac-input ac-input-narrow"
              type="number"
              placeholder="Sort order"
              value={draft.sort_order}
              onChange={e => setDraft(p => ({ ...p, sort_order: e.target.value }))}
            />
            {/* FIX: is_active toggle — sends is_active in the PATCH payload */}
            <label className="ac-active-toggle">
              <input
                type="checkbox"
                checked={draft.is_active !== false}
                onChange={e => setDraft(p => ({ ...p, is_active: e.target.checked }))}
                className="ac-active-checkbox"
              />
              <span>Active (visible to customers)</span>
            </label>
            <div className="ac-cat-edit-actions">
              <button className="ac-btn-save" disabled={saving} onClick={handleSave}>
                {saving ? <span className="ac-spinner" /> : 'Save'}
              </button>
              <button className="ac-btn-cancel" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="ac-cat-info" onClick={() => children.length > 0 && setExpanded(!expanded)} style={{ cursor: children.length > 0 ? 'pointer' : 'default' }}>
            <div className="ac-cat-name-row">
              {children.length > 0 && (
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round"
                  className={`ac-has-children-icon${expanded ? ' expanded' : ''}`}
                >
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
              <span className="ac-cat-name">{node.name}</span>
              <span className="ac-cat-slug">{node.category_slug}</span>
              {node.sort_order != null && (
                <span className="ac-cat-order">order {node.sort_order}</span>
              )}
              {/* FIX: show inactive badge in read mode so admin can see status at a glance */}
              {node.is_active === false && (
                <span className="ac-cat-inactive-badge">Inactive</span>
              )}
            </div>
            {node.description && <p className="ac-cat-desc">{node.description}</p>}
          </div>
        )}

        {!editing && (
          <div className="ac-cat-actions">
            <span className="ac-cat-depth-badge">depth {node.depth ?? depth}</span>
            <button className="ac-action-btn ac-action-edit" onClick={() => setEditing(true)}>Edit</button>
            <button
              className="ac-action-btn ac-action-delete"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? <span className="ac-spinner" /> : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {/* Recurse - conditionally show children if expanded */}
      {expanded && children.length > 0 && children.map(child => (
        <CategoryRow
          key={child.category_id}
          node={child}
          depth={depth + 1}
          flatList={flatList}
          onSave={onSave}
          onDelete={onDelete}
        />
      ))}
    </>
  );
};

const AdminCategories = () => {
  const [tree, setTree]         = useState([]);
  const [flatList, setFlatList] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCat, setNewCat]     = useState(EMPTY_NEW);
  const [creating, setCreating] = useState(false);
  const [toast, setToast]       = useState({ msg: '', type: 'success' });

  const showToast  = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
  const clearToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoryService.getCategoryTree();
      const payload = res?.data ?? res;
      const nodes = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.categories)
          ? payload.categories
          : [];
      setTree(nodes);
      setFlatList(flattenTree(nodes));
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to load categories.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadTree(); }, [loadTree]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCat.name.trim()) {
      showToast('Category name is required.', 'error'); return;
    }
    setCreating(true);
    try {
      await categoryService.createCategory({
        name:            newCat.name.trim(),
        description:     newCat.description.trim() || undefined,
        parent_category: newCat.parent_category ? Number(newCat.parent_category) : null,
        sort_order:      newCat.sort_order !== '' ? Number(newCat.sort_order) : undefined,
      });
      showToast('Category created. Slug and tree auto-computed by database.');
      setNewCat(EMPTY_NEW);
      setShowCreate(false);
      window.dispatchEvent(new Event('folkmint:categories-updated'));
      await loadTree();
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to create category.', 'error');
    } finally {
      setCreating(false);
    }
  };

  // FIX: now forwards is_active from draft to the PATCH call
  const handleSave = async (categoryId, draft) => {
    try {
      await categoryService.updateCategory(categoryId, {
        name:            draft.name.trim(),
        description:     draft.description.trim() || undefined,
        parent_category: draft.parent_category ? Number(draft.parent_category) : null,
        sort_order:      draft.sort_order !== '' ? Number(draft.sort_order) : undefined,
        is_active:       draft.is_active !== false,
      });
      showToast('Category updated.');
      window.dispatchEvent(new Event('folkmint:categories-updated'));
      await loadTree();
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to update category.', 'error');
    }
  };

  const handleDelete = async (categoryId) => {
    try {
      await categoryService.deleteCategory(categoryId);
      showToast('Category deleted.');
      window.dispatchEvent(new Event('folkmint:categories-updated'));
      await loadTree();
    } catch (err) {
      showToast(err?.error || err?.message || 'Failed to delete category.', 'error');
    }
  };

  return (
    <div className="ac-page">

      <div className="ac-head">
        <div>
          <p className="ac-eyebrow">Admin</p>
          <h1 className="ac-title">Categories</h1>
        </div>
        <div className="ac-head-actions">
          <button className="ac-refresh-btn" onClick={loadTree} disabled={loading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
          <button className="ac-create-btn" onClick={() => setShowCreate(v => !v)}>
            {showCreate ? 'Cancel' : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Category</>}
          </button>
        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} onDismiss={clearToast} />

      {/* Note about auto-computed fields */}
      <div className="ac-info-banner">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>
          <strong>slug</strong>, <strong>depth</strong>, and <strong>full_path</strong> are auto-computed
          by the database trigger on every save. Never set them manually.
        </span>
      </div>

      {/* ── CREATE FORM ── */}
      {showCreate && (
        <div className="ac-create-card">
          <h3 className="ac-card-title">New Category</h3>
          <form className="ac-create-form" onSubmit={handleCreate} noValidate>
            <div className="ac-create-row">
              <div className="ac-field ac-field-grow">
                <label className="ac-label">Name <span className="ac-req">*</span></label>
                <input
                  className="ac-input"
                  placeholder="e.g. Jamdani Saree"
                  value={newCat.name}
                  onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="ac-field ac-field-grow">
                <label className="ac-label">Description</label>
                <input
                  className="ac-input"
                  placeholder="Short description"
                  value={newCat.description}
                  onChange={e => setNewCat(p => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="ac-create-row">
              <div className="ac-field ac-field-grow">
                <label className="ac-label">Parent category</label>
                <select
                  className="ac-select"
                  value={newCat.parent_category}
                  onChange={e => setNewCat(p => ({ ...p, parent_category: e.target.value }))}
                >
                  <option value="">No parent (root category)</option>
                  {flatList.map(c => (
                    <option key={c.category_id} value={c.category_id}>
                      {'—'.repeat(c.depth)} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ac-field ac-field-narrow">
                <label className="ac-label">Sort order</label>
                <input
                  className="ac-input"
                  type="number"
                  placeholder="0"
                  value={newCat.sort_order}
                  onChange={e => setNewCat(p => ({ ...p, sort_order: e.target.value }))}
                />
              </div>
            </div>
            <div className="ac-create-foot">
              <button className="ac-create-btn" type="submit" disabled={creating}>
                {creating ? <><span className="ac-spinner" /> Creating…</> : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TREE ── */}
      <div className="ac-tree-card">
        <div className="ac-tree-head">
          <p className="ac-tree-count">{flatList.length} categor{flatList.length !== 1 ? 'ies' : 'y'}</p>
        </div>

        {loading ? (
          <div className="ac-loading"><div className="ac-spinner ac-spinner-lg" /><p>Loading…</p></div>
        ) : !tree.length ? (
          <div className="ac-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            <p>No categories yet. Create one above.</p>
          </div>
        ) : (
          <div className="ac-tree">
            {tree.map(node => (
              <CategoryRow
                key={node.category_id}
                node={node}
                depth={0}
                flatList={flatList}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .ac-page {
          width: 100%; padding: 40px 48px 64px;
          display: flex; flex-direction: column; gap: 16px;
          background: var(--bg-alt); min-height: 100vh;
        }
        .ac-head {
          display: flex; align-items: flex-end;
          justify-content: space-between; gap: 20px; margin-bottom: 4px;
        }
        .ac-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: .22em;
          text-transform: uppercase; color: var(--gold); margin: 0 0 6px;
        }
        .ac-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 600; color: var(--dark); line-height: 1.1; margin: 0;
        }
        .ac-head-actions { display: flex; gap: 10px; }
        .ac-refresh-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: var(--r);
          font-size: 13px; font-weight: 600; color: var(--dark);
          cursor: pointer; transition: all .2s;
        }
        .ac-refresh-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
        .ac-refresh-btn:disabled { opacity: .5; cursor: not-allowed; }
        .ac-create-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 20px; background: var(--dark); color: var(--gold);
          border: none; border-radius: var(--r); font-size: 13px;
          font-weight: 700; letter-spacing: .06em; cursor: pointer;
          transition: background .2s; white-space: nowrap;
        }
        .ac-create-btn:hover:not(:disabled) { background: var(--black); }
        .ac-create-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* toast */
        .ac-toast {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: var(--r);
          font-size: 13.5px; font-weight: 500; border: 1px solid;
          animation: ac-fade .2s ease;
        }
        @keyframes ac-fade { from { opacity: 0; transform: translateY(-6px); } }
        .ac-toast-success { background: #f0faf3; border-color: #bbe5c8; color: #156238; }
        .ac-toast-error   { background: #fff2f3; border-color: #f5c2c7; color: #9f1239; }

        /* info banner */
        .ac-info-banner {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 16px; background: #eff6ff;
          border: 1px solid #bfdbfe; border-radius: var(--r);
          font-size: 13px; color: #1d4ed8; line-height: 1.6;
        }

        /* create card */
        .ac-create-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); padding: 28px 32px;
          animation: ac-fade .2s ease;
        }
        .ac-card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 600; color: var(--dark); margin: 0 0 20px;
        }
        .ac-create-form { display: flex; flex-direction: column; gap: 14px; }
        .ac-create-row { display: flex; gap: 14px; flex-wrap: wrap; }
        .ac-create-foot { display: flex; justify-content: flex-end; }
        .ac-field { display: flex; flex-direction: column; gap: 5px; }
        .ac-field-grow { flex: 1 1 200px; }
        .ac-field-narrow { flex: 0 0 120px; }
        .ac-label {
          font-size: 11px; font-weight: 700; letter-spacing: .06em;
          text-transform: uppercase; color: var(--muted);
        }
        .ac-req { color: #b91c1c; margin-left: 2px; }
        .ac-input {
          padding: 9px 13px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: calc(var(--r) - 2px);
          font-size: 13.5px; color: var(--dark); font-family: inherit;
          box-sizing: border-box; width: 100%; transition: border-color .2s;
        }
        .ac-input:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 3px rgba(196,146,42,.1); }
        .ac-input-narrow { width: 100%; }
        .ac-select {
          padding: 9px 13px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: calc(var(--r) - 2px);
          font-size: 13.5px; color: var(--dark); font-family: inherit;
          cursor: pointer; box-sizing: border-box; width: 100%;
        }
        .ac-select:focus { outline: none; border-color: var(--gold); }

        /* is_active toggle */
        .ac-active-toggle {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: var(--color-text-secondary, var(--muted));
          cursor: pointer; white-space: nowrap; flex-basis: 100%;
          padding: 4px 0;
        }
        .ac-active-checkbox {
          width: 15px; height: 15px;
          accent-color: var(--gold);
          cursor: pointer; flex-shrink: 0;
        }

        /* inactive badge shown in read mode */
        .ac-cat-inactive-badge {
          font-size: 10px; font-weight: 700; letter-spacing: .06em;
          text-transform: uppercase;
          color: #f87171;
          background: rgba(220,38,38,0.1);
          border: 1px solid rgba(220,38,38,0.25);
          padding: 1px 7px; border-radius: 999px;
        }

        /* tree card */
        .ac-tree-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r); overflow: hidden;
        }
        .ac-tree-head {
          padding: 14px 20px; border-bottom: 1px solid var(--border);
          background: var(--bg-alt);
        }
        .ac-tree-count {
          font-size: 12px; font-weight: 700; letter-spacing: .08em;
          text-transform: uppercase; color: var(--muted); margin: 0;
        }
        .ac-loading, .ac-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 56px 24px; color: var(--muted); font-size: 14px;
        }
        .ac-tree { display: flex; flex-direction: column; }

        /* category row */
        .ac-cat-row {
          position: relative;
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 14px;
          padding: 14px 20px 14px 16px;
          border-bottom: 1px solid var(--border);
          transition: background .2s;
          min-width: 0;
        }
        .ac-cat-row:last-child { border-bottom: none; }
        .ac-cat-row:hover { background: var(--bg); }
        .ac-cat-indent-line {
          position: absolute; top: 0; bottom: 0;
          width: 1px; background: var(--border); opacity: .5;
        }
        .ac-cat-info { flex: 1; min-width: 0; }
        .ac-cat-name-row {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .ac-has-children-icon { color: var(--muted); flex-shrink: 0; }
        .ac-cat-name {
          font-size: 14px; font-weight: 600; color: var(--dark);
        }
        .ac-cat-slug {
          font-family: ui-monospace, monospace;
          font-size: 11px; color: var(--muted);
          background: var(--bg-alt); padding: 2px 7px;
          border-radius: 4px; border: 1px solid var(--border);
        }
        .ac-cat-order {
          font-size: 11px; color: var(--muted);
        }
        .ac-cat-desc {
          font-size: 12.5px; color: var(--muted);
          margin: 4px 0 0; line-height: 1.5;
        }
        .ac-cat-actions {
          display: flex; align-items: center; gap: 8px; flex-shrink: 0;
        }
        .ac-cat-depth-badge {
          font-size: 10px; font-weight: 700; color: var(--muted);
          background: var(--bg-alt); padding: 2px 8px;
          border-radius: 999px; border: 1px solid var(--border);
          white-space: nowrap;
        }
        .ac-action-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 12px; border-radius: calc(var(--r) - 2px);
          font-size: 12px; font-weight: 700; cursor: pointer;
          border: 1px solid; transition: all .2s; white-space: nowrap;
        }
        .ac-action-btn:disabled { opacity: .4; cursor: not-allowed; }
        .ac-action-edit {
          background: var(--bg); border-color: var(--border); color: var(--dark);
        }
        .ac-action-edit:hover { border-color: var(--gold); color: var(--gold); }
        .ac-action-delete {
          background: rgba(220,38,38,0.1); border-color: rgba(220,38,38,0.25); color: #f87171;
        }
        .ac-action-delete:hover:not(:disabled) {
          background: #dc2626; border-color: #dc2626; color: #fff;
        }

        .ac-has-children-icon {
          color: var(--muted);
          flex-shrink: 0;
          transition: transform .2s ease;
        }
        .ac-has-children-icon.expanded {
          transform: rotate(90deg);
        }

        /* inline edit form */
        .ac-cat-edit-form {
          display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end; flex: 1;
        }
        .ac-cat-edit-form .ac-input { flex: 1 1 160px; }
        .ac-cat-edit-form .ac-select { flex: 1 1 180px; }
        .ac-cat-edit-actions { display: flex; gap: 6px; }
        .ac-btn-save {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; background: var(--dark); color: var(--gold);
          border: none; border-radius: calc(var(--r) - 2px);
          font-size: 12px; font-weight: 700; cursor: pointer; transition: background .2s;
        }
        .ac-btn-save:hover:not(:disabled) { background: var(--black); }
        .ac-btn-save:disabled { opacity: .5; cursor: not-allowed; }
        .ac-btn-cancel {
          padding: 8px 14px; background: var(--bg);
          border: 1px solid var(--border); border-radius: calc(var(--r) - 2px);
          font-size: 12px; font-weight: 600; color: var(--muted); cursor: pointer;
          transition: all .2s;
        }
        .ac-btn-cancel:hover { color: var(--dark); border-color: var(--border-hover); }

        /* spinner */
        @keyframes ac-spin { to { transform: rotate(360deg); } }
        .ac-spinner {
          display: inline-block; width: 13px; height: 13px;
          border: 2px solid rgba(196,146,42,.3);
          border-top-color: var(--gold); border-radius: 50%;
          animation: ac-spin .7s linear infinite; flex-shrink: 0;
        }
        .ac-spinner-lg { width: 28px; height: 28px; }

        @media (max-width: 860px) {
          .ac-page { padding: 24px 20px 48px; }
          .ac-head { flex-direction: column; align-items: flex-start; }
          .ac-cat-edit-form { flex-direction: column; }
        }
      `}</style>
    </div>
  );
};

export default AdminCategories;