// src/utils/sharepointClient.js
// Talks to SharePoint lists via the SharePoint REST API
// Uses the browser's existing SharePoint session (no separate login needed)
// The user must be logged into SharePoint in the same browser

const SITE_URL = process.env.REACT_APP_SHAREPOINT_URL;
const API_BASE = `${SITE_URL}/_api/web/lists`;

// ── Request digest (CSRF token) for write operations ─────────────────────────
let _digest = null;
let _digestExpiry = null;

async function getDigest() {
  if (_digest && _digestExpiry && Date.now() < _digestExpiry) return _digest;
  const res = await fetch(`${SITE_URL}/_api/contextinfo`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json;odata=verbose' },
  });
  if (!res.ok) throw new Error('Could not get SharePoint context. Are you logged into SharePoint?');
  const data = await res.json();
  _digest = data.d.GetContextWebInformation.FormDigestValue;
  _digestExpiry = Date.now() + 25 * 60 * 1000; // 25 min
  return _digest;
}

// ── Fetch wrapper ─────────────────────────────────────────────────────────────
async function spFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      Accept: 'application/json;odata=verbose',
      'Content-Type': 'application/json;odata=verbose',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message?.value || `SharePoint error: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function spWrite(path, body, method = 'POST', etag = null) {
  const digest = await getDigest();
  return spFetch(path, {
    method,
    body: JSON.stringify(body),
    headers: {
      'X-RequestDigest': digest,
      ...(etag ? { 'IF-MATCH': etag, 'X-HTTP-Method': method === 'DELETE' ? 'DELETE' : 'MERGE' } : {}),
    },
  });
}

// ── ROSTER ────────────────────────────────────────────────────────────────────

export async function getRoster() {
  const data = await spFetch(`/getbytitle('Roster')/items?$select=Id,FirstName,LastName,JobTitle,IsActive&$filter=IsActive eq 1&$orderby=LastName`);
  return data.d.results.map(item => ({
    id: String(item.Id),
    firstName: item.FirstName || '',
    lastName: item.LastName || '',
    fullName: `${item.FirstName || ''} ${item.LastName || ''}`.trim(),
    jobTitle: item.JobTitle || '',
    isActive: item.IsActive !== false,
  }));
}

export async function addRosterMember({ firstName, lastName, jobTitle }) {
  return spWrite(`/getbytitle('Roster')/items`, {
    __metadata: { type: 'SP.Data.RosterListItem' },
    FirstName: firstName,
    LastName: lastName,
    JobTitle: jobTitle,
    IsActive: true,
    Title: `${firstName} ${lastName}`,
  });
}

export async function deactivateRosterMember(id) {
  const digest = await getDigest();
  return spFetch(`/getbytitle('Roster')/items(${id})`, {
    method: 'POST',
    body: JSON.stringify({ __metadata: { type: 'SP.Data.RosterListItem' }, IsActive: false }),
    headers: { 'X-RequestDigest': digest, 'IF-MATCH': '*', 'X-HTTP-Method': 'MERGE' },
  });
}

// ── AVAILABILITY ──────────────────────────────────────────────────────────────

export async function getAvailability({ fromDate, toDate } = {}) {
  let filter = '';
  if (fromDate && toDate) {
    filter = `&$filter=StartDate ge datetime'${fromDate}T00:00:00Z' and EndDate le datetime'${toDate}T00:00:00Z'`;
  }
  const data = await spFetch(
    `/getbytitle('Availability')/items?$select=Id,TeamMember,StartDate,EndDate,StatusCode,StartTime,EndTime,Notes,EnteredBy&$orderby=StartDate${filter}&$top=500`
  );
  return data.d.results.map(item => ({
    id: String(item.Id),
    teamMember: item.TeamMember || '',
    startDate: item.StartDate ? item.StartDate.substring(0, 10) : '',
    endDate: item.EndDate ? item.EndDate.substring(0, 10) : '',
    statusCode: item.StatusCode || 'Available',
    startTime: item.StartTime || '',
    endTime: item.EndTime || '',
    notes: item.Notes || '',
    enteredBy: item.EnteredBy || '',
  }));
}

export async function createAvailabilityEntry(entry) {
  return spWrite(`/getbytitle('Availability')/items`, {
    __metadata: { type: 'SP.Data.AvailabilityListItem' },
    Title: `${entry.teamMember} ${entry.startDate}`,
    TeamMember: entry.teamMember,
    StartDate: entry.startDate + 'T00:00:00Z',
    EndDate: entry.endDate + 'T00:00:00Z',
    StatusCode: entry.statusCode,
    StartTime: entry.startTime || '',
    EndTime: entry.endTime || '',
    Notes: entry.notes || '',
    EnteredBy: entry.enteredBy || '',
  });
}

export async function deleteAvailabilityEntry(id) {
  const digest = await getDigest();
  return spFetch(`/getbytitle('Availability')/items(${id})`, {
    method: 'POST',
    headers: { 'X-RequestDigest': digest, 'IF-MATCH': '*', 'X-HTTP-Method': 'DELETE' },
  });
}

// ── CONFIGURATION ─────────────────────────────────────────────────────────────

export async function getConfig() {
  const data = await spFetch(`/getbytitle('Configuration')/items?$select=SettingKey,SettingValue`);
  const map = {};
  data.d.results.forEach(item => { map[item.SettingKey] = item.SettingValue; });
  return {
    coverageWarningPercent: parseInt(map.CoverageWarningPercent || '40'),
    coverageWarningHeadcount: parseInt(map.CoverageWarningHeadcount || '3'),
    managerEmail1: map.ManagerEmail1 || '',
    managerEmail2: map.ManagerEmail2 || '',
    teamTimezone: map.TeamTimezone || 'Central',
  };
}
