import React, { useEffect, useState } from 'react';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const QUEUES = ['Tier-1', 'Tier-2', 'Billing', 'VIP'];
const MATCH_TYPES = ['keyword', 'regex'];

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  };
}

const EMPTY_FORM = { name: '', match: '', matchType: 'keyword', priority: 'medium', queue: 'Tier-1', weight: 50, enabled: true };

export default function TriageRulesEditor() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await fetch('/api/custom-views/triage-rules', { headers: authHeaders() });
      const j = await r.json();
      setRules(j.rules || []);
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const url = editingId ? `/api/custom-views/triage-rules/${editingId}` : '/api/custom-views/triage-rules';
      const method = editingId ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      if (!r.ok) throw new Error((await r.json()).error || `Failed (${r.status})`);
      setForm(EMPTY_FORM); setEditingId(null); await load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function remove(id) {
    if (!confirm('Delete this rule?')) return;
    await fetch(`/api/custom-views/triage-rules/${id}`, { method: 'DELETE', headers: authHeaders() });
    await load();
  }

  function startEdit(rule) {
    setEditingId(rule.id);
    setForm({ name: rule.name, match: rule.match, matchType: rule.matchType, priority: rule.priority, queue: rule.queue, weight: rule.weight, enabled: rule.enabled });
  }

  async function runPreview() {
    setPreview({ loading: true });
    try {
      const r = await fetch('/api/custom-views/triage-rules/preview', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ match: form.match, matchType: form.matchType }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'preview failed');
      setPreview(j);
    } catch (e) { setPreview({ error: e.message }); }
  }

  return (
    <div data-testid="triage-rules-editor">
      <h3 style={{ margin: '0 0 12px', color: '#111827' }}>Triage Rules Editor</h3>
      {err && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 8, borderRadius: 6, marginBottom: 10 }}>Error: {err}</div>}

      <form onSubmit={submit} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8 }}>
        <input placeholder="Rule name" value={form.name} onChange={(e) => update('name', e.target.value)} required style={inputSt} />
        <input placeholder="Pattern (regex or keywords)" value={form.match} onChange={(e) => update('match', e.target.value)} required style={inputSt} />
        <select value={form.matchType} onChange={(e) => update('matchType', e.target.value)} style={inputSt}>
          {MATCH_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={form.priority} onChange={(e) => update('priority', e.target.value)} style={inputSt}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={form.queue} onChange={(e) => update('queue', e.target.value)} style={inputSt}>
          {QUEUES.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
        <input type="number" min="0" max="100" placeholder="Weight" value={form.weight} onChange={(e) => update('weight', Number(e.target.value))} style={inputSt} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={!!form.enabled} onChange={(e) => update('enabled', e.target.checked)} /> enabled
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="submit" disabled={busy} style={btnPrimary}>{editingId ? 'Update' : 'Add'} Rule</button>
          <button type="button" onClick={runPreview} disabled={!form.match || busy} style={btnSecondary}>Preview</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }} style={btnGhost}>Cancel</button>}
        </div>
      </form>

      {preview && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: 10, marginBottom: 16 }}>
          {preview.loading ? 'Previewing...' :
           preview.error ? <span style={{ color: '#991b1b' }}>{preview.error}</span> :
           <>
             <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Preview: {preview.count} match{preview.count === 1 ? '' : 'es'} of {preview.scanned}</div>
             <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#374151' }}>
               {preview.matches.slice(0, 8).map((m) => <li key={m.id}>{m.id} — {m.subject} ({m.customer})</li>)}
             </ul>
           </>
          }
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <thead style={{ background: '#f3f4f6', textAlign: 'left' }}>
          <tr>
            <th style={th}>Name</th><th style={th}>Pattern</th><th style={th}>Type</th>
            <th style={th}>Priority</th><th style={th}>Queue</th><th style={th}>Weight</th>
            <th style={th}>Enabled</th><th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} style={{ borderTop: '1px solid #f3f4f6' }}>
              <td style={td}>{r.name}</td>
              <td style={td}><code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>{r.match}</code></td>
              <td style={td}>{r.matchType}</td>
              <td style={td}>{r.priority}</td>
              <td style={td}>{r.queue}</td>
              <td style={td}>{r.weight}</td>
              <td style={td}>{r.enabled ? 'yes' : 'no'}</td>
              <td style={td}>
                <button onClick={() => startEdit(r)} style={btnSmall}>Edit</button>{' '}
                <button onClick={() => remove(r.id)} style={{ ...btnSmall, background: '#fee2e2', color: '#991b1b' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const inputSt = { padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#ffffff', color: '#111827' };
const th = { padding: '8px 10px', fontWeight: 600, fontSize: 12, color: '#374151' };
const td = { padding: '8px 10px', color: '#111827' };
const btnPrimary = { padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 };
const btnSecondary = { padding: '6px 12px', background: '#fff', color: '#2563eb', border: '1px solid #2563eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' };
const btnGhost = { padding: '6px 12px', background: 'transparent', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer' };
const btnSmall = { padding: '3px 8px', background: '#f3f4f6', color: '#111827', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, cursor: 'pointer' };
