// src/components/WeekGrid.js
import React, { useState } from 'react';
import { format, addDays, addWeeks, startOfWeek, isToday } from 'date-fns';
import { STATUS_CODES, toDS } from '../utils/parser';

export default function WeekGrid({ roster, entries, getStatusForDay }) {
  const [offset, setOffset] = useState(0);
  const today = new Date(); today.setHours(0,0,0,0);
  const mon = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), offset);
  const days = [0,1,2,3,4].map(i => addDays(mon, i));
  const label = offset === 0 ? 'This Week' : offset === 1 ? 'Next Week' : offset === -1 ? 'Last Week' : `${format(days[0],'MMM d')} – ${format(days[4],'MMM d')}`;

  return (
    <div className="card week-grid-card">
      <div className="card-header">
        <div className="card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          {label}
        </div>
        <div className="week-nav">
          <button className="wk-btn" onClick={() => setOffset(o=>o-1)}>‹</button>
          <button className="wk-btn" onClick={() => setOffset(0)}>Today</button>
          <button className="wk-btn" onClick={() => setOffset(o=>o+1)}>›</button>
        </div>
      </div>
      <div className="grid-wrap">
        <table className="avail-table">
          <thead>
            <tr>
              <th className="col-name">Team Member</th>
              {days.map(d => {
                const ds = toDS(d); const tod = isToday(d);
                return <th key={ds} className={`col-day${tod?' today-col':''}`} style={{minWidth:68}}>
                  <span className="day-lbl">{format(d,'EEE')}</span>
                  <span className={`day-num${tod?' today-num':''}`}>{d.getDate()}</span>
                </th>;
              })}
            </tr>
          </thead>
          <tbody>
            {roster.map((m, i) => (
              <tr key={m.id} className={i%2===0?'row-even':'row-odd'}>
                <td className="cell-name">
                  <div className="name-inner">
                    <span className="initials">{m.firstName[0]}{m.lastName[0]}</span>
                    <span>{m.fullName}</span>
                  </div>
                </td>
                {days.map(d => {
                  const ds = toDS(d); const code = getStatusForDay(m.fullName, ds); const info = STATUS_CODES[code];
                  return <td key={ds} className={`cell-status${isToday(d)?' today-cell':''}`}>
                    <div className="chip" style={{background:info.bg,color:info.color,borderColor:info.color+'44'}} title={`${m.fullName}: ${info.label}`}>{info.abbr}</div>
                  </td>;
                })}
              </tr>
            ))}
            {roster.length === 0 && <tr><td colSpan={6} className="empty-state">No team members yet. Go to the Roster tab to add people.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="legend">
        {Object.entries(STATUS_CODES).map(([k,v]) => (
          <div key={k} className="legend-item">
            <span className="legend-dot" style={{background:v.color}}/>
            <span className="legend-label">{v.abbr} — {v.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
