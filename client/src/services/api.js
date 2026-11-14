const API_BASE = '/api';

async function parseResponse(res, fallbackMessage) {
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    // Non-JSON response (e.g. HTML 404 or 502)
  }
  if (!res.ok) {
    throw new Error(data.error || `${fallbackMessage} (HTTP ${res.status})`);
  }
  return data;
}

export async function checkBackendHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return parseResponse(res, 'Backend health check failed');
}

export async function fetchBatches() {
  const res = await fetch(`${API_BASE}/batches`);
  return parseResponse(res, 'Failed to fetch batches');
}

export async function fetchPlacementStats(year = 'ALL') {
  const res = await fetch(`${API_BASE}/placements/stats?year=${encodeURIComponent(year)}`);
  return parseResponse(res, 'Failed to fetch placement stats');
}

export async function adminLogin(passcode) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode: (passcode || '').trim() })
  });
  return parseResponse(res, 'Admin authentication failed');
}

export async function changeAdminPasscode(current_passcode, new_passcode, adminToken) {
  const res = await fetch(`${API_BASE}/admin/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken
    },
    body: JSON.stringify({
      current_passcode: (current_passcode || '').trim(),
      new_passcode: (new_passcode || '').trim()
    })
  });
  return parseResponse(res, 'Failed to change passcode');
}

export async function addPlacementDrive(driveData, adminToken) {
  const res = await fetch(`${API_BASE}/placements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken
    },
    body: JSON.stringify(driveData)
  });
  return parseResponse(res, 'Failed to add placement drive');
}

export async function deletePlacementDrive(id, adminToken) {
  const res = await fetch(`${API_BASE}/placements/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': adminToken }
  });
  return parseResponse(res, 'Failed to delete placement drive');
}

export async function updateBatchCapacities(batchData, adminToken) {
  const res = await fetch(`${API_BASE}/batches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken
    },
    body: JSON.stringify(batchData)
  });
  return parseResponse(res, 'Failed to update batch capacities');
}

export async function deleteBatch(year, adminToken) {
  const res = await fetch(`${API_BASE}/batches/${encodeURIComponent(year)}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': adminToken }
  });
  return parseResponse(res, 'Failed to delete batch');
}

export async function resetDatabase(adminToken) {
  const res = await fetch(`${API_BASE}/seed`, {
    method: 'POST',
    headers: { 'x-admin-token': adminToken }
  });
  return parseResponse(res, 'Failed to reset database');
}
