import React, { useEffect, useState } from 'react';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  };
}

export default function BulkMacroReply() {
  const [tickets, setTickets] = useState([]);
  const [macros, setMacros] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [macroId, setMacroId] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [err, setErr] = useState(null);

  async function load() {
    try {
      const [a, b] = await Promise.all([
        fetch('/api/custom-views/macros', { headers: authHeaders() }).then((r) => r.json()),
        fetch('/api/custom-views/macros/history', { headers: authHeaders() }).then((r) => r.json()),
      ]);
      setTickets(a.tickets || []);
      setMacros(a.macros || []);
      if (!macroId && a.macros?.length) setMacroId(a.macros[0].id);
      setHistory(b.records || []);
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => prev.size === tickets.length ? new Set() : new Set(tickets.map((t) => t.id)));
  }

  async function send() {
    setBusy(true); setErr(null); setResult(null);
    try {
      const r = await fetch('/api/custom-views/macros/bulk-send', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ ticketIds: Array.from(selected), macroId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `Failed (${r.status})`);
      setResult(j);
      setSelected(new Set());
      // refresh history
      const h = await fetch('/api/custom-views/macros/history', { headers: authHeaders() }).then((x) => x.json());
      setHistory(h.records || []);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const chosenMacro = macros.find((m) => m.id === macroId);

  return (
    <div data-testid="bulk-macro-reply">
      <h3 style={{ margin: '0 0 12px', color: '#111827' }}>Bulk Macro Reply</h3>
      {err && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 8, borderRadius: 6, marginBottom: 10 }}>Error: {err}</div>}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 380px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, maxHeight: 380, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 13, color: '#111827' }}>Tickets ({selected.size}/{tickets.length} selected)</strong>
            <button onClick={toggleAll} style={btnSmall}>{selected.size === tickets.length ? 'Clear' : 'Select all'}</button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {tickets.map((t) => (
              <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                <span style={{ fontFamily: 'monospace', color: '#6b7280', minWidth: 60 }}>{t.id}</span>
                <span style={{ flex: 1, color: '#111827' }}>{t.subject}</span>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{t.status}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ flex: '1 1 280px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <strong style={{ fontSize: 13, color: '#111827', display: 'block', marginBottom: 8 }}>Macro</strong>
          <select value={macroId} onChange={(e) => setMacroId(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
            {macros.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {chosenMacro && (
            <div style={{ marginTop: 10, padding: 10, background: '#f9fafb', borderRadius: 6, fontSize: 12, color: '#374151', whiteSpace: 'pre-wrap' }}>
              {chosenMacro.body}
            </div>
          )}
          <button onClick={send} disabled={busy || selected.size === 0 || !macroId} style={{ ...btnPrimary, marginTop: 12, width: '100%' }}>
            {busy ? 'Sending...' : `Send to ${selected.size} ticket${selected.size === 1 ? '' : 's'}`}
          </button>
          {result && (
            <div style={{ marginTop: 10, padding: 8, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6, fontSize: 12, color: '#065f46' }}>
              Recorded {result.sent} send{result.sent === 1 ? '' : 's'} to <code>{result.table}</code>.
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <strong style={{ fontSize: 13, color: '#111827' }}>Send history (macro_sends)</strong>
        <div style={{ marginTop: 6, maxHeight: 160, overflowY: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          {history.length === 0 ? (
            <div style={{ padding: 12, fontSize: 12, color: '#9ca3af' }}>No sends recorded yet.</div>
          ) : (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr><th style={th}>id</th><th style={th}>ticket</th><th style={th}>macro</th><th style={th}>sent_at</th></tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={td}>{h.id}</td>
                    <td style={td}>{h.ticket_id}</td>
                    <td style={td}>{h.macro_name}</td>
                    <td style={td}>{new Date(h.sent_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const btnPrimary = { padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 };
const btnSmall = { padding: '3px 8px', background: '#f3f4f6', color: '#111827', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, cursor: 'pointer' };
const th = { padding: '6px 10px', fontWeight: 600, textAlign: 'left', color: '#374151' };
const td = { padding: '6px 10px', color: '#111827' };
