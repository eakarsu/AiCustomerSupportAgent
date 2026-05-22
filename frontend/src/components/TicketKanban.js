import React, { useEffect, useState } from 'react';

const PRIORITY_STYLE = {
  urgent: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  high:   { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' },
  medium: { bg: '#fef9c3', text: '#854d0e', border: '#fde68a' },
  low:    { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
};

const COLUMN_STYLE = {
  'new':         { headerBg: '#eff6ff', accent: '#2563eb' },
  'in-progress': { headerBg: '#fefce8', accent: '#ca8a04' },
  'waiting':     { headerBg: '#fdf4ff', accent: '#a21caf' },
  'resolved':    { headerBg: '#ecfdf5', accent: '#059669' },
};

export default function TicketKanban() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch('/api/custom-views/kanban', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div style={{ color: '#b91c1c' }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 16, color: '#6b7280' }}>Loading kanban...</div>;

  return (
    <div data-testid="ticket-kanban">
      <h3 style={{ margin: '0 0 12px', color: '#111827' }}>Ticket Kanban ({data.total} tickets)</h3>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 8 }}>
        {data.columns.map((col) => {
          const cs = COLUMN_STYLE[col.status] || { headerBg: '#f3f4f6', accent: '#6b7280' };
          return (
            <div
              key={col.status}
              style={{
                flex: '1 0 240px',
                minWidth: 240,
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  background: cs.headerBg,
                  borderBottom: `2px solid ${cs.accent}`,
                  borderRadius: '8px 8px 0 0',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  color: '#111827',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{col.label}</span>
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{col.tickets.length}</span>
              </div>
              <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.tickets.length === 0 && (
                  <div style={{ padding: 12, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>No tickets</div>
                )}
                {col.tickets.map((t) => {
                  const ps = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.medium;
                  return (
                    <div
                      key={t.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                        padding: 10,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: '#6b7280' }}>{t.id}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            borderRadius: 999,
                            background: ps.bg,
                            color: ps.text,
                            border: `1px solid ${ps.border}`,
                          }}
                        >
                          {t.priority}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#111827', fontWeight: 500, marginBottom: 4 }}>{t.subject}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{t.customer} · {t.assignee} · {t.queue}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
