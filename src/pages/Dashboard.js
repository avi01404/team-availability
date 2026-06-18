// src/pages/Dashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays, startOfWeek, isToday, parseISO } from 'date-fns';
import { getRoster, getAvailability, createAvailabilityEntry, deleteAvailabilityEntry, addRosterMember, deactivateRosterMember, getConfig } from '../utils/sharepointClient';
import { parseInput, detectConflicts, analyzeCoverage, STATUS_CODES, toDS } from '../utils/parser';
import WeekGrid from '../components/WeekGrid';
import RosterPanel from '../components/RosterPanel';
import CoverageWarnings from '../components/CoverageWarnings';
import BotChat from '../components/BotChat';
import RosterManager from '../components/RosterManager';

export default function Dashboard() {
  const [roster, setRoster] = useState([]);
  const [entries, setEntries] = useState([]);
  const [config, setConfig] = useState({ coverageWarningPercent: 40, coverageWarningHeadcount: 3 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingEntry, setPendingEntry] = useState(null);
  const [chatMessages, setChatMessages] = useState([{
    role: 'bot',
    text: 'Welcome! Log availability like:\n\n• **John Doe VR July 12-19**\n• **Jane Smith P Aug 2 1-4pm**\n• **Bob Jones vacation next week, reachable**\n\nType **HELP** for all commands.',
    ts: new Date(),
  }]);
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const today = new Date();
      const from = toDS(addDays(today, -7));
      const to = toDS(addDays(today, 90));
      const [r, e, c] = await Promise.all([
        getRoster(),
        getAvailability({ fromDate: from, toDate: to }),
        getConfig(),
      ]);
      setRoster(r);
      setEntries(e);
      setConfig(c);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const addBot = (text, extra = {}) => setChatMessages(prev => [...prev, { role: 'bot', text, ts: new Date(), ...extra }]);
  const addUser = (text) => setChatMessages(prev => [...prev, { role: 'user', text, ts: new Date() }]);

  const handleBot = async (input) => {
    if (!input.trim() || processing) return;
    setProcessing(true);
    addUser(input);
    const lower = input.trim().toLowerCase();

    try {
      // CONFIRM
      if (pendingEntry && !pendingEntry.conflictMode && !pendingEntry.deleteMode &&
          ['confirm','yes','yep','save','ok','correct','y'].includes(lower)) {
        await createAvailabilityEntry({
          teamMember: pendingEntry.member.fullName,
          startDate: pendingEntry.startDate,
          endDate: pendingEntry.endDate,
          statusCode: pendingEntry.code,
          startTime: pendingEntry.startTime,
          endTime: pendingEntry.endTime,
          enteredBy: 'Manager',
        });
        await loadData();
        addBot(`✅ Saved! **${pendingEntry.member.fullName}** — ${STATUS_CODES[pendingEntry.code].label} · ${pendingEntry.startDate}${pendingEntry.startDate !== pendingEntry.endDate ? ' → ' + pendingEntry.endDate : ''}`);
        setPendingEntry(null);
        setProcessing(false); return;
      }

      // CANCEL
      if (pendingEntry && ['cancel','no','nope','fix','wrong','n'].includes(lower)) {
        setPendingEntry(null);
        addBot('Cancelled. Nothing was saved.');
        setProcessing(false); return;
      }

      // Conflict resolution
      if (pendingEntry?.conflictMode) {
        if (lower === 'a') {
          for (const c of pendingEntry.conflicts) await deleteAvailabilityEntry(c.id);
          await createAvailabilityEntry({ teamMember: pendingEntry.member.fullName, startDate: pendingEntry.startDate, endDate: pendingEntry.endDate, statusCode: pendingEntry.code, startTime: pendingEntry.startTime, endTime: pendingEntry.endTime, enteredBy: 'Manager' });
          await loadData();
          addBot(`✅ Replaced! **${pendingEntry.member.fullName}** — ${STATUS_CODES[pendingEntry.code].label} · ${pendingEntry.startDate} → ${pendingEntry.endDate}`);
          setPendingEntry(null); setProcessing(false); return;
        }
        if (lower === 'b') { addBot('Kept existing entry. Nothing changed.'); setPendingEntry(null); setProcessing(false); return; }
      }

      // Delete by number
      if (pendingEntry?.deleteMode) {
        const n = parseInt(lower);
        if (lower === 'all') {
          for (const e of pendingEntry.entries) await deleteAvailabilityEntry(e.id);
          await loadData();
          addBot(`🗑️ Deleted all ${pendingEntry.entries.length} entries for **${pendingEntry.member.fullName}**.`);
          setPendingEntry(null); setProcessing(false); return;
        }
        if (!isNaN(n) && n >= 1 && n <= pendingEntry.entries.length) {
          const e = pendingEntry.entries[n-1];
          await deleteAvailabilityEntry(e.id);
          await loadData();
          addBot(`🗑️ Deleted: **${pendingEntry.member.fullName}** — ${STATUS_CODES[e.statusCode].label} ${e.startDate}${e.startDate !== e.endDate ? ' → ' + e.endDate : ''}`);
          setPendingEntry(null); setProcessing(false); return;
        }
      }

      // HELP
      if (lower === 'help') {
        addBot(`**Commands:**\n\n**Log availability:**\nFirstName LastName STATUS dates\nExample: *John Doe VR July 12-19*\n\n**Status codes:**\nAVL · H · U · VR · VU · F · P · T · J\n\n**Other commands:**\n• SHOW [Name] — upcoming entries\n• DELETE [Name] — remove entries\n• STATUS — today's summary\n• Use the Roster tab to add/remove people`);
        setProcessing(false); return;
      }

      // STATUS
      if (lower === 'status') {
        const today = toDS(new Date());
        const active = roster.filter(m => m.isActive);
        const lines = active.map(m => {
          const e = entries.find(en => en.teamMember === m.fullName && en.startDate <= today && en.endDate >= today);
          return `• ${m.fullName}: ${STATUS_CODES[e?.statusCode || 'Available'].label}`;
        }).join('\n');
        addBot(`**Today (${format(new Date(), 'EEE, MMM d')}):**\n\n${lines || 'No team members yet.'}`);
        setProcessing(false); return;
      }

      // SHOW
      if (lower.startsWith('show ')) {
        const q = input.replace(/^show\s+/i,'').trim().toLowerCase();
        const m = roster.find(m => m.fullName.toLowerCase().includes(q));
        if (!m) { addBot(`Couldn't find "${q}" in the roster.`); setProcessing(false); return; }
        const today = toDS(new Date());
        const es = entries.filter(e => e.teamMember === m.fullName && e.endDate >= today).sort((a,b) => a.startDate.localeCompare(b.startDate));
        if (!es.length) { addBot(`No upcoming entries for **${m.fullName}** — they're available.`); setProcessing(false); return; }
        const lines = es.map(e => `• ${e.startDate}${e.startDate !== e.endDate ? ' → ' + e.endDate : ''}: **${STATUS_CODES[e.statusCode].label}**${e.startTime ? ` (${e.startTime}${e.endTime ? '–'+e.endTime : ''})` : ''}`).join('\n');
        addBot(`**Upcoming for ${m.fullName}:**\n\n${lines}`);
        setProcessing(false); return;
      }

      // DELETE
      if (lower.startsWith('delete ') || lower.startsWith('remove ')) {
        const rest = input.replace(/^(delete|remove)\s+/i,'').trim();
        const m = roster.find(m => rest.toLowerCase().startsWith(m.fullName.toLowerCase()));
        if (!m) { addBot(`Couldn't find a team member in: "${rest}"`); setProcessing(false); return; }
        const es = entries.filter(e => e.teamMember === m.fullName);
        if (!es.length) { addBot(`No entries for **${m.fullName}** to delete.`); setProcessing(false); return; }
        if (es.length === 1) {
          await deleteAvailabilityEntry(es[0].id);
          await loadData();
          addBot(`🗑️ Deleted: **${m.fullName}** — ${STATUS_CODES[es[0].statusCode].label} ${es[0].startDate}${es[0].startDate !== es[0].endDate ? ' → '+es[0].endDate : ''}`);
          setProcessing(false); return;
        }
        const list = es.map((e,i) => `${i+1}. ${e.startDate}${e.startDate !== e.endDate ? ' → '+e.endDate : ''}: ${STATUS_CODES[e.statusCode].label}`).join('\n');
        addBot(`**${m.fullName}** has ${es.length} entries:\n\n${list}\n\nReply with the number to delete, or **ALL** to delete all.`);
        setPendingEntry({ deleteMode: true, member: m, entries: es });
        setProcessing(false); return;
      }

      // Availability parse
      const parsed = parseInput(input, roster.filter(m => m.isActive));
      if (parsed.type === 'ERROR') { addBot(`⚠️ ${parsed.msg}`); setProcessing(false); return; }
      if (parsed.type === 'ADD_PERSON') { addBot(`Use the **Roster** tab to add team members!`); setProcessing(false); return; }

      // Conflict check
      const conflicts = detectConflicts(parsed, entries);
      if (conflicts.length) {
        const list = conflicts.map(c => `• ${STATUS_CODES[c.statusCode].label} · ${c.startDate}${c.startDate !== c.endDate ? ' → '+c.endDate : ''}`).join('\n');
        addBot(`⚠️ **Conflict for ${parsed.member.fullName}!**\n\nExisting:\n${list}\n\nNew: **${STATUS_CODES[parsed.code].label}** · ${parsed.startDate} → ${parsed.endDate}\n\n**A** — Replace existing\n**B** — Cancel, keep existing\n\nReply A or B.`);
        setPendingEntry({ ...parsed, conflictMode: true, conflicts });
        setProcessing(false); return;
      }

      // Confirm prompt
      const timeNote = parsed.startTime ? `\nTime: ${parsed.startTime}${parsed.endTime ? ' – '+parsed.endTime : ''}` : '';
      addBot(`Ready to save:\n\n**Team Member:** ${parsed.member.fullName}\n**Status:** ${STATUS_CODES[parsed.code].label} (${parsed.code})\n**From:** ${parsed.startDate}\n**To:** ${parsed.endDate}${timeNote}\n\nReply **CONFIRM** to save or **CANCEL** to discard.`);
      setPendingEntry(parsed);

    } catch (err) {
      addBot(`❌ Error: ${err.message}`);
    }
    setProcessing(false);
  };

  const getStatusForDay = (memberName, dateStr) => {
    const e = entries.find(e => e.teamMember === memberName && e.startDate <= dateStr && e.endDate >= dateStr);
    return e?.statusCode || 'Available';
  };

  const today = toDS(new Date());
  const warnings = analyzeCoverage(entries, roster.filter(m => m.isActive), config).filter(w => w.date >= today).slice(0, 5);

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"/>
      <p>Connecting to SharePoint…</p>
    </div>
  );

  if (error) return (
    <div className="error-screen">
      <div className="error-card">
        <h2>⚠️ Connection Error</h2>
        <p>{error}</p>
        <p className="error-hint">Make sure you're logged into SharePoint in this browser, and that your REACT_APP_SHAREPOINT_URL is set correctly.</p>
        <button onClick={() => { setError(null); setLoading(true); loadData().finally(() => setLoading(false)); }}>Retry</button>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="10" fill="#2a4f7c"/>
            <rect x="10" y="14" width="28" height="3" rx="1.5" fill="#60a5fa"/>
            <rect x="10" y="20" width="20" height="3" rx="1.5" fill="#93c5fd"/>
            <rect x="10" y="26" width="24" height="3" rx="1.5" fill="#60a5fa"/>
            <circle cx="36" cy="34" r="7" fill="#22c55e"/>
            <path d="M33 34l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="app-title">Team Availability</span>
        </div>
        <nav className="header-nav">
          <button className={`nav-tab${activeTab==='dashboard'?' active':''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
          <button className={`nav-tab${activeTab==='bot'?' active':''}`} onClick={() => setActiveTab('bot')}>
            Bot {pendingEntry && <span className="nav-badge"/>}
          </button>
          <button className={`nav-tab${activeTab==='roster'?' active':''}`} onClick={() => setActiveTab('roster')}>Roster</button>
        </nav>
        <div className="header-right">
          <span className="sp-indicator">● SharePoint connected</span>
        </div>
      </header>

      <main className="app-main">
        {activeTab === 'dashboard' && (
          <div className="dashboard-layout">
            <div className="dashboard-left">
              {warnings.length > 0 && <CoverageWarnings warnings={warnings}/>}
              <WeekGrid roster={roster.filter(m=>m.isActive)} entries={entries} getStatusForDay={getStatusForDay}/>
            </div>
            <div className="dashboard-right">
              <RosterPanel roster={roster.filter(m=>m.isActive)} entries={entries} getStatusForDay={getStatusForDay} todayStr={today}/>
            </div>
          </div>
        )}
        {activeTab === 'bot' && (
          <BotChat messages={chatMessages} onSubmit={handleBot} processing={processing} pendingEntry={pendingEntry}/>
        )}
        {activeTab === 'roster' && (
          <RosterManager roster={roster} onAdd={async (m) => { await addRosterMember(m); await loadData(); }} onRemove={async (id) => { await deactivateRosterMember(id); await loadData(); }}/>
        )}
      </main>
    </div>
  );
}
