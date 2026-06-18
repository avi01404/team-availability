// src/components/CoverageWarnings.js
import React from 'react';
import { format, parseISO } from 'date-fns';

export default function CoverageWarnings({ warnings }) {
  if (!warnings.length) return null;
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title" style={{color:'#dc2626'}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#dc2626" strokeWidth="1.5"/><line x1="12" y1="9" x2="12" y2="13" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/></svg>
          Coverage Warnings
          <span className="count-badge" style={{background:'#fee2e2',color:'#dc2626'}}>{warnings.length}</span>
        </div>
      </div>
      <div>
        {warnings.map((w,i) => (
          <div key={i} className={`warn-item ${w.level}`}>
            <div className="warn-date"><strong>{format(parseISO(w.date),'EEE, MMM d')}</strong></div>
            <div>
              {w.level==='critical'?'🔴':'🟡'} {w.cnt} people out ({w.pct}%) — {w.level==='critical'?<strong>Critical coverage</strong>:'Coverage concern'}
              <div className="warn-people">{w.people.join(', ')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
