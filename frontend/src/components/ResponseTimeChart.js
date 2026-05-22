import React, { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, ErrorBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// Boxplot-style visualization using a stacked bar with whiskers as ErrorBars.
// Stack: invisible offset (min) -> lowerWhisker -> box -> (top of bar shows median)
export default function ResponseTimeChart() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch('/api/custom-views/response-times', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div style={{ color: '#b91c1c' }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 16, color: '#6b7280' }}>Loading response time chart...</div>;

  // shape rows for recharts: each agent has offset (min), box (q3-q1), with whisker error bars
  const rows = data.series.map((s) => ({
    agent: s.agent,
    offset: s.q1,
    box: s.box,
    median: s.median,
    // whisker spans full min->max around the box
    whiskerLow: s.q1 - s.min,
    whiskerHigh: s.max - s.q3,
    sampleCount: s.sampleCount,
    // helper for tooltip
    min: s.min, q1: s.q1, q3: s.q3, max: s.max,
  }));

  return (
    <div data-testid="response-time-chart">
      <h3 style={{ margin: '0 0 12px', color: '#111827' }}>First-Response Time per Agent ({data.unit})</h3>
      <div style={{ width: '100%', height: 360, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="agent" tick={{ fill: '#374151', fontSize: 12 }} />
            <YAxis tick={{ fill: '#374151', fontSize: 12 }} label={{ value: 'minutes', angle: -90, position: 'insideLeft', fill: '#6b7280' }} />
            <Tooltip
              formatter={(value, name, props) => {
                if (name === 'box') return [`Q1=${props.payload.q1} Median=${props.payload.median} Q3=${props.payload.q3}`, 'IQR'];
                if (name === 'offset') return [`${props.payload.min} min`, 'min'];
                return [value, name];
              }}
            />
            <Legend />
            {/* invisible offset to "lift" the box off zero */}
            <Bar dataKey="offset" stackId="bp" fill="transparent" legendType="none" />
            {/* the IQR box */}
            <Bar dataKey="box" stackId="bp" fill="#3b82f6" name="IQR (Q1-Q3)">
              <ErrorBar dataKey="whiskerHigh" width={10} strokeWidth={2} stroke="#1e3a8a" direction="y" />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
        Boxplot-style: bar height = IQR (Q1→Q3) lifted to Q1, whisker = max above Q3. Hover for detail.
      </div>
    </div>
  );
}
