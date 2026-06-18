// src/components/RosterManager.js
import React, { useState } from 'react';

export default function RosterManager({ roster, onAdd, onRemove }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [jobTitle, setJobTitle]   = useState('');
  const [saving, setSaving]       = useState(false);

  const handleAdd = async () => {
    if (!firstName.trim() || !lastName.trim()) { alert('First and last name required.'); return; }
    setSaving(true);
    try { await onAdd({ firstName: firstName.trim(), lastName: lastName.trim(), jobTitle: jobTitle.trim() }); setFirstName(''); setLastName(''); setJobTitle(''); }
    catch (e) { alert('Error adding member: ' + e.message); }
    setSaving(false);
  };

  const active = roster.filter(m => m.isActive);

  return (
    <div className="roster-mgr">
      <h2>Manage Team Roster</h2>
      <div className="add-form">
        <input className="add-input" placeholder="First name" value={firstName} onChange={e=>setFirstName(e.target.value)}/>
        <input className="add-input" placeholder="Last name"  value={lastName}  onChange={e=>setLastName(e.target.value)}/>
        <input className="add-input wide" placeholder="Job title" value={jobTitle} onChange={e=>setJobTitle(e.target.value)}/>
        <button className="btn-add" onClick={handleAdd} disabled={saving}>{saving ? 'Saving…' : 'Add Member'}</button>
      </div>
      <table className="member-table">
        <thead><tr><th>First</th><th>Last</th><th>Title</th><th></th></tr></thead>
        <tbody>
          {active.map(m => (
            <tr key={m.id}>
              <td>{m.firstName}</td>
              <td>{m.lastName}</td>
              <td>{m.jobTitle}</td>
              <td><button className="btn-remove" onClick={() => { if(window.confirm(`Remove ${m.fullName}?`)) onRemove(m.id); }}>Remove</button></td>
            </tr>
          ))}
          {active.length === 0 && <tr><td colSpan={4} style={{padding:'16px',textAlign:'center',color:'var(--text3)'}}>No team members yet. Add one above.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
