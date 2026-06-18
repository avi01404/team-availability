// src/utils/parser.js

export const STATUS_CODES = {
  Available: { label: 'Available',            color: '#16a34a', bg: '#dcfce7', abbr: 'AVL' },
  H:         { label: 'Holiday',              color: '#6b7280', bg: '#f3f4f6', abbr: 'H'   },
  U:         { label: 'Unavailable',          color: '#dc2626', bg: '#fee2e2', abbr: 'U'   },
  VR:        { label: 'Vacation Reachable',   color: '#ca8a04', bg: '#fef9c3', abbr: 'VR'  },
  VU:        { label: 'Vacation Unavailable', color: '#ea580c', bg: '#ffedd5', abbr: 'VU'  },
  F:         { label: 'Firm Activity',        color: '#7c3aed', bg: '#ede9fe', abbr: 'F'   },
  P:         { label: 'Partial Day',          color: '#0284c7', bg: '#e0f2fe', abbr: 'P'   },
  T:         { label: 'Training',             color: '#0d9488', bg: '#ccfbf1', abbr: 'T'   },
  J:         { label: 'Jury Duty',            color: '#374151', bg: '#f9fafb', abbr: 'J'   },
};

const ALIASES = {
  'available':'Available','in':'Available','working':'Available','back':'Available','normal':'Available',
  'h':'H','holiday':'H','public holiday':'H',
  'u':'U','unavailable':'U','out':'U','ooo':'U','absent':'U','out of office':'U','not available':'U',
  'vr':'VR','vacation reachable':'VR','pto reachable':'VR','vac reachable':'VR','reachable':'VR','out but reachable':'VR',
  'vu':'VU','vacation unavailable':'VU','pto':'VU','vacation':'VU','full vacation':'VU','on vacation':'VU',
  'f':'F','firm':'F','firm activity':'F','committed':'F','blocked':'F',
  'p':'P','partial':'P','partial day':'P','half day':'P','leaving early':'P','in later':'P',
  't':'T','training':'T','course':'T','conference':'T','offsite':'T','learning':'T',
  'j':'J','jury':'J','jury duty':'J','court':'J',
};

const MONTHS = {
  jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,
  jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,september:8,
  oct:9,october:9,nov:10,november:10,dec:11,december:11,
};

const DAYMAP = { monday:1,mon:1,tuesday:2,tue:2,wednesday:3,wed:3,thursday:4,thu:4,thur:4,friday:5,fri:5 };

export function toDS(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }

function nextMonday(d) {
  const r = new Date(d); const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? 1 : 8 - day)); return r;
}

function startOfWeek(d) {
  const r = new Date(d); const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); return r;
}

function parseRelDate(s) {
  const l = s.toLowerCase().trim();
  const t = new Date(); t.setHours(0,0,0,0);
  if (l === 'today') return { s: toDS(t), e: toDS(t) };
  if (l === 'tomorrow') { const d = addDays(t,1); return { s: toDS(d), e: toDS(d) }; }
  if (/next\s+week/.test(l)) { const m = nextMonday(t); return { s: toDS(m), e: toDS(addDays(m,4)) }; }
  if (/this\s+week/.test(l)) { const m = startOfWeek(t); return { s: toDS(m), e: toDS(addDays(m,4)) }; }
  const nd = l.match(/next\s+(monday|tuesday|wednesday|thursday|friday|mon|tue|wed|thu|thur|fri)/);
  if (nd) { const m = nextMonday(t); const d = addDays(m, DAYMAP[nd[1]]-1); return { s: toDS(d), e: toDS(d) }; }
  const nr = l.match(/next\s+(mon|tue|wed|thu|thur|fri|monday|tuesday|wednesday|thursday|friday)\s*[-–]\s*(mon|tue|wed|thu|thur|fri|monday|tuesday|wednesday|thursday|friday)/);
  if (nr) { const m = nextMonday(t); return { s: toDS(addDays(m, DAYMAP[nr[1]]-1)), e: toDS(addDays(m, DAYMAP[nr[2]]-1)) }; }
  return null;
}

function parseDateRange(s) {
  const rel = parseRelDate(s); if (rel) return rel;
  const l = s.toLowerCase();
  const rng = l.match(/([a-z]+)\s+(\d{1,2})\s*[-–]\s*(?:([a-z]+)\s+)?(\d{1,2})/);
  if (rng) {
    const m1 = MONTHS[rng[1]];
    if (m1 !== undefined) {
      const yr = new Date().getFullYear();
      const m2 = rng[3] ? (MONTHS[rng[3]] ?? m1) : m1;
      const sd = new Date(yr, m1, parseInt(rng[2]));
      const ed = new Date(yr, m2, parseInt(rng[4]));
      if (!isNaN(sd) && !isNaN(ed)) return { s: toDS(sd), e: toDS(ed) };
    }
  }
  const sng = l.match(/([a-z]+)\s+(\d{1,2})/);
  if (sng) {
    const m = MONTHS[sng[1]];
    if (m !== undefined) { const d = new Date(new Date().getFullYear(), m, parseInt(sng[2])); if (!isNaN(d)) return { s: toDS(d), e: toDS(d) }; }
  }
  return null;
}

function parseTime(s) {
  const l = s.toLowerCase();
  const rng = l.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (rng) { const mer = rng[3]||rng[6]; return { st: `${rng[1]}:${rng[2]||'00'} ${mer.toUpperCase()} CT`, et: `${rng[4]}:${rng[5]||'00'} ${rng[6].toUpperCase()} CT` }; }
  const aft = l.match(/after\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (aft) return { st: `${aft[1]}:${aft[2]||'00'} ${aft[3].toUpperCase()} CT`, et: '' };
  const unt = l.match(/(?:until|leaving(?:\s+at)?)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (unt) return { st: '', et: `${unt[1]}:${unt[2]||'00'} ${unt[3].toUpperCase()} CT` };
  return null;
}

function resolveStatus(raw) {
  if (!raw) return null;
  const u = raw.toUpperCase().trim();
  if (STATUS_CODES[u]) return u;
  if (STATUS_CODES[raw]) return raw;
  return ALIASES[raw.toLowerCase().trim()] || null;
}

export function parseInput(input, roster) {
  const trim = input.trim();

  const ap = trim.match(/^add\s+person\s+([a-z]+)\s+([a-z]+)\s+(.+)$/i);
  if (ap) return { type: 'ADD_PERSON', firstName: ap[1], lastName: ap[2], jobTitle: ap[3].trim() };

  let member = null, remaining = trim;
  const sorted = [...roster].sort((a,b) => b.fullName.length - a.fullName.length);
  for (const m of sorted) {
    const re = new RegExp('^' + m.firstName + '\\s+' + m.lastName + '\\b', 'i');
    if (re.test(trim)) { member = m; remaining = trim.replace(re,'').trim(); break; }
  }
  if (!member) return { type: 'ERROR', msg: `Couldn't find a team member name in "${trim}". Format: FirstName LastName STATUS dates` };

  let code = null;
  const mws = ['vacation unavailable','vacation reachable','partial day','jury duty','firm activity','out of office','not available','out but reachable','public holiday'];
  for (const mw of mws) {
    if (new RegExp('\\b'+mw+'\\b','i').test(remaining)) { code = resolveStatus(mw); remaining = remaining.replace(new RegExp(mw,'i'),'').trim(); break; }
  }
  if (!code) {
    const toks = remaining.split(/\s+/);
    for (let i = 0; i < toks.length; i++) { const r = resolveStatus(toks[i]); if (r) { code = r; toks.splice(i,1); remaining = toks.join(' '); break; } }
  }
  if (!code) {
    const l = remaining.toLowerCase();
    if (/vacation/.test(l) && /reachable/.test(l)) code = 'VR';
    else if (/vacation/.test(l)) code = 'VU';
    else if (/partial|half.day/.test(l)) code = 'P';
    else if (/training|conference/.test(l)) code = 'T';
    else if (/jury/.test(l)) code = 'J';
    else if (/holiday/.test(l)) code = 'H';
    else if (/out|unavailable|ooo/.test(l)) code = 'U';
    else code = 'Available';
  }

  const dr = parseDateRange(remaining);
  if (!dr) return { type: 'ERROR', msg: `Found ${member.fullName} (${code}) but couldn't parse a date from "${remaining}". Try: July 12-19, next week, Aug 2` };

  const tr = parseTime(remaining) || {};
  return { type: 'AVAILABILITY', member, code, startDate: dr.s, endDate: dr.e, startTime: tr.st||'', endTime: tr.et||'' };
}

export function detectConflicts(parsed, entries) {
  return entries.filter(e => {
    if (e.teamMember !== parsed.member.fullName) return false;
    if (e.statusCode === 'Available') return false;
    return parsed.startDate <= e.endDate && parsed.endDate >= e.startDate;
  });
}

export function analyzeCoverage(entries, roster, config) {
  const active = roster.filter(m => m.isActive);
  const n = active.length;
  const map = {};
  entries.forEach(e => {
    if (e.statusCode === 'Available') return;
    let d = new Date(e.startDate + 'T12:00:00');
    const end = new Date(e.endDate + 'T12:00:00');
    while (d <= end) { const ds = toDS(d); if (!map[ds]) map[ds] = []; map[ds].push(e); d = addDays(d,1); }
  });
  const warns = [];
  Object.entries(map).forEach(([date, dayE]) => {
    const people = [...new Set(dayE.map(e => e.teamMember))];
    const cnt = people.length;
    const pct = n > 0 ? Math.round(cnt/n*100) : 0;
    if (cnt >= config.coverageWarningHeadcount && pct >= config.coverageWarningPercent) warns.push({ date, level: 'critical', cnt, pct, people });
    else if (pct >= config.coverageWarningPercent || cnt >= config.coverageWarningHeadcount) warns.push({ date, level: 'warning', cnt, pct, people });
  });
  return warns.sort((a,b) => a.date.localeCompare(b.date));
}
