import React, { useState } from 'react';
import TicketKanban from '../components/TicketKanban.js';
import ResponseTimeChart from '../components/ResponseTimeChart.js';
import TriageRulesEditor from '../components/TriageRulesEditor.js';
import BulkMacroReply from '../components/BulkMacroReply.js';

const TABS = [
  { key: 'kanban',  label: 'Ticket Kanban' },
  { key: 'times',   label: 'Response Times' },
  { key: 'triage',  label: 'Triage Rules' },
  { key: 'macros',  label: 'Bulk Macro Reply' },
];

export default function CustomViewsPage() {
  const [tab, setTab] = useState('kanban');

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }} data-testid="custom-views-page">
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, color: '#111827', fontSize: 24, fontWeight: 700 }}>Support Views</h1>
        <p style={{ marginTop: 4, color: '#6b7280', fontSize: 14 }}>
          Custom support-domain dashboards and operational tooling.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: 18 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 14px',
              border: 'none',
              background: 'transparent',
              borderBottom: tab === t.key ? '2px solid #2563eb' : '2px solid transparent',
              color: tab === t.key ? '#2563eb' : '#6b7280',
              fontWeight: tab === t.key ? 600 : 500,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'kanban' && <TicketKanban />}
        {tab === 'times'  && <ResponseTimeChart />}
        {tab === 'triage' && <TriageRulesEditor />}
        {tab === 'macros' && <BulkMacroReply />}
      </div>
    </div>
  );
}
