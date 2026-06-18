// src/components/RosterPanel.js
import React from 'react';
import { format, parseISO } from 'date-fns';
import { STATUS_CODES } from '../utils/parser';

export default function RosterPanel({ roster, entries, getStatusForDay, todayStr }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Team Roster
          <span className="count-badge">{roster.length}</span>
        </div>
        <span style={{fontSize:12,color:'var(--text2)'}}>{format(new Date(),'EEE, MMM d')}</span>
      </div>
      <div className="roster-list">
        {roster.map(m => {
          const code = getStatusForDay(m.fullName, todayStr);
          const info = STATUS_CODES[code];
          const next = entries.filter(e => e.teamMember === m.fullName && e.statusCode !== 'Available' && e.endDate > todayStr).sort((a,b) => a.startDate.localeCompare(b.startDate))[0];
          return (
            <div key={m.id} className="roster-row">
              <div className="r-avatar" style={{background:info.bg,color:info.color}}>{m.firstName[0]}{m.lastName[0]}</div>
              <div className="r-info">
                <div className="r-name">{m.fullName}</div>
                <div className="r-title">{m.jobTitle}</div>
                {next && code === 'Available' && (
                  <div className="r-upcoming">
                    <span style={{color:STATUS_CODES[next.statusCode]?.color}}>↗ {STATUS_CODES[next.statusCode]?.label}</span>
                    {' '}<span style={{color:'var(--text3)'}}>{format(parseISO(next.startDate),'MMM d')}{next.startDate!==next.endDate?'–'+format(parseISO(next.endDate),'MMM d'):''}</span>
                  </div>
                )}
              </div>
              <div><span className="status-pill" style={{background:info.bg,color:info.color,borderColor:info.color+'55'}}>{info.abbr}</span></div>
            </div>
          );
        })}
        {roster.length === 0 && <div className="empty-roster"><p>No team members yet.</p><p style={{marginTop:8}}>Go to the <strong>Roster</strong> tab to add people.</p></div>}
      </div>
    </div>
  );
}
