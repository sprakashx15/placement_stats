const API_BASE = '/api';

export async function fetchBatches() {
  const res = await fetch(`${API_BASE}/batches`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch batches (${res.status})`);
  }
  return res.json();
}

export async function fetchPlacementStats(year = 'ALL') {
  const res = await fetch(`${API_BASE}/placements/stats?year=${encodeURIComponent(year)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch placement stats (${res.status})`);
  }
  return res.json();
}

export async function adminLogin(passcode) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Admin login failed');
  return data;
}

export async function changeAdminPasscode(current_passcode, new_passcode, adminToken) {
  const res = await fetch(`${API_BASE}/admin/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken
    },
    body: JSON.stringify({ current_passcode, new_passcode })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to change passcode');
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add placement drive');
  return data;
}

export async function deletePlacementDrive(id, adminToken) {
  const res = await fetch(`${API_BASE}/placements/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': adminToken }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete placement drive');
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update batch capacities');
  return data;
}

export async function deleteBatch(year, adminToken) {
  const res = await fetch(`${API_BASE}/batches/${encodeURIComponent(year)}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': adminToken }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete batch');
  return data;
}

export async function resetDatabase(adminToken) {
  const res = await fetch(`${API_BASE}/seed`, {
    method: 'POST',
    headers: { 'x-admin-token': adminToken }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reset database');
  return data;
}
