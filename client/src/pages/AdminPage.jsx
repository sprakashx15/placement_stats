import React, { useState, useEffect } from 'react';
import {
  Lock, Unlock, PlusCircle, Trash2, RefreshCw, CheckCircle, AlertCircle,
  Layers, Sliders, LogOut, Plus, X, FolderPlus, Sparkles, KeyRound, ShieldCheck
} from 'lucide-react';
import {
  adminLogin, addPlacementDrive, deletePlacementDrive,
  updateBatchCapacities, deleteBatch, resetDatabase, fetchBatches,
  changeAdminPasscode
} from '../services/api';

export default function AdminPage({
  isAdmin,
  adminToken,
  onAdminLogin,
  onAdminLogout,
  placementStats,
  selectedYear,
  batches = [],
  onRefreshStats
}) {
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('add_placement');
  const [notification, setNotification] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Batches state
  const [availableBatches, setAvailableBatches] = useState(batches || []);

  // Drive Batch selection
  const [driveBatch, setDriveBatch] = useState(() => {
    if (batches && batches.length > 0) return batches[0].academic_year;
    return '';
  });
  const [isCreatingNewBatch, setIsCreatingNewBatch] = useState(batches.length === 0);
  const [newBatchName, setNewBatchName] = useState('');

  // Branch hires dictionary for the drive form
  const [branchHires, setBranchHires] = useState({});
  const [newBranchInput, setNewBranchInput] = useState('');

  const [placementForm, setPlacementForm] = useState({
    company_name: '',
    role: '',
    offer_type: 'FTE',
    ctc: '',
    notes: ''
  });

  // Batch Capacities Form State
  const [capacityBatchYear, setCapacityBatchYear] = useState(() => {
    if (batches && batches.length > 0) return batches[0].academic_year;
    return '';
  });
  const [batchCapacities, setBatchCapacities] = useState({});
  const [newCapacityBranchInput, setNewCapacityBranchInput] = useState('');
  const [newCapacityBranchCount, setNewCapacityBranchCount] = useState(80);

  // Change Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPasscode: '',
    newPasscode: '',
    confirmPasscode: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Sync available batches when batches prop updates
  useEffect(() => {
    setAvailableBatches(batches || []);
    if (batches && batches.length > 0) {
      if (!driveBatch) setDriveBatch(batches[0].academic_year);
      if (!capacityBatchYear) setCapacityBatchYear(batches[0].academic_year);
    } else {
      setIsCreatingNewBatch(true);
    }
  }, [batches]);

  // When driveBatch changes, populate branches from that batch if known
  useEffect(() => {
    const foundBatch = availableBatches.find(b => b.academic_year === driveBatch);
    if (foundBatch && foundBatch.branches && Object.keys(foundBatch.branches).length > 0) {
      setBranchHires(prev => {
        const next = { ...prev };
        Object.keys(foundBatch.branches).forEach(b => {
          if (next[b] === undefined) next[b] = 0;
        });
        return next;
      });
    }
  }, [driveBatch, availableBatches]);

  // When capacityBatchYear changes, update batchCapacities
  useEffect(() => {
    const found = availableBatches.find(b => b.academic_year === capacityBatchYear);
    if (found && found.branches && Object.keys(found.branches).length > 0) {
      setBatchCapacities({ ...found.branches });
    }
  }, [capacityBatchYear, availableBatches]);

  const totalHires = Object.values(branchHires).reduce((s, v) => s + (Number(v) || 0), 0);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const data = await adminLogin(passcode);
      if (data.success) {
        onAdminLogin(data.token);
        setPasscode('');
      }
    } catch (err) {
      setLoginError(err.message || 'Invalid passcode');
    }
  };

  // Add a new branch to the drive form on the fly
  const handleAddBranchToDrive = (e) => {
    if (e) e.preventDefault();
    const branch = newBranchInput.trim().toUpperCase();
    if (!branch) {
      showToast('Please type a branch name (e.g. CSE, MnC, AI, ME)', 'error');
      return;
    }
    if (branchHires[branch] !== undefined) {
      showToast(`Branch ${branch} is already in the list.`, 'error');
      return;
    }
    setBranchHires(prev => ({ ...prev, [branch]: 0 }));
    setNewBranchInput('');
    showToast(`Added branch ${branch}`);
  };

  // Remove a branch from drive form
  const handleRemoveBranchFromDrive = (branch) => {
    setBranchHires(prev => {
      const copy = { ...prev };
      delete copy[branch];
      return copy;
    });
  };

  // Add a new batch name
  const handleAddNewBatch = (e) => {
    if (e) e.preventDefault();
    const batch = newBatchName.trim();
    if (!batch) {
      showToast('Please enter an academic year (e.g. 2025-2026)', 'error');
      return;
    }
    if (availableBatches.some(b => b.academic_year === batch)) {
      showToast(`Batch ${batch} already exists.`, 'error');
      return;
    }
    const newEntry = {
      academic_year: batch,
      total_eligible: 0,
      branches: { ...batchCapacities }
    };
    setAvailableBatches(prev => [newEntry, ...prev]);
    setDriveBatch(batch);
    setCapacityBatchYear(batch);
    setNewBatchName('');
    setIsCreatingNewBatch(false);
    showToast(`Selected batch ${batch}.`);
  };

  // Add a branch to Batch Capacities tab
  const handleAddBranchToCapacity = (e) => {
    if (e) e.preventDefault();
    const branch = newCapacityBranchInput.trim().toUpperCase();
    if (!branch) {
      showToast('Please enter a branch name in the "Branch Code / Name" box (e.g. CSE, MnC, AI)', 'error');
      return;
    }
    if (batchCapacities[branch] !== undefined) {
      showToast(`Branch ${branch} already exists in this batch.`, 'error');
      return;
    }
    const count = Math.max(1, parseInt(newCapacityBranchCount) || 50);
    setBatchCapacities(prev => ({ ...prev, [branch]: count }));
    setNewCapacityBranchInput('');
    showToast(`Added branch ${branch} with capacity of ${count} students!`);
  };

  // Remove a branch from Batch Capacities tab
  const handleRemoveBranchFromCapacity = (branch) => {
    setBatchCapacities(prev => {
      const copy = { ...prev };
      delete copy[branch];
      return copy;
    });
  };

  // Populate standard IIT Patna branches in one click
  const handlePopulateStandardBranches = () => {
    const presets = {
      'CSE': 80,
      'AI & DS': 40,
      'MNC': 50,
      'ECE': 70,
      'EE': 60,
      'ME': 70,
      'CE': 50,
      'CBE': 40,
      'MME': 40
    };
    setBatchCapacities(prev => ({ ...prev, ...presets }));
    showToast('Loaded standard IIT Patna branches! Adjust capacities as needed.');
  };

  // Submit new placement drive
  const handlePlacementSubmit = async (e) => {
    e.preventDefault();
    const targetBatch = isCreatingNewBatch ? newBatchName.trim() : driveBatch.trim();
    if (!targetBatch) {
      showToast('Please select or enter an academic batch year (e.g. 2025-2026).', 'error');
      return;
    }
    if (!placementForm.company_name || !placementForm.role || !placementForm.ctc) {
      showToast('Please fill company name, job role, and CTC package.', 'error');
      return;
    }
    if (Object.keys(branchHires).length === 0) {
      showToast('Please add at least one branch to record hires.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await addPlacementDrive({
        academic_year: targetBatch,
        company_name: placementForm.company_name,
        role: placementForm.role,
        offer_type: placementForm.offer_type,
        ctc: Number(placementForm.ctc),
        total_hires: totalHires,
        branch_hires: branchHires,
        notes: placementForm.notes
      }, adminToken);

      showToast(`Added ${placementForm.company_name} (${totalHires} ${placementForm.offer_type} offers at ₹${placementForm.ctc} LPA) to Batch ${targetBatch}!`);

      setPlacementForm({
        company_name: '',
        role: '',
        offer_type: 'FTE',
        ctc: '',
        notes: ''
      });

      // Keep branch keys, reset hire counts to 0
      setBranchHires(prev => {
        const reset = {};
        Object.keys(prev).forEach(k => { reset[k] = 0; });
        return reset;
      });

      if (isCreatingNewBatch) {
        setIsCreatingNewBatch(false);
        setDriveBatch(targetBatch);
      }

      onRefreshStats();
      const freshBatches = await fetchBatches().catch(() => []);
      if (freshBatches.length > 0) setAvailableBatches(freshBatches);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Placement Drive
  const handleDeleteDrive = async (id, company) => {
    if (!window.confirm(`Delete ${company} drive?`)) return;
    try {
      await deletePlacementDrive(id, adminToken);
      showToast(`Deleted ${company} drive.`);
      onRefreshStats();
    } catch (err) { showToast(err.message, 'error'); }
  };

  // Save Batch Capacities
  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    const targetBatch = capacityBatchYear.trim();
    if (!targetBatch) {
      showToast('Please enter an academic year for the batch (e.g. 2025-2026).', 'error');
      return;
    }
    if (Object.keys(batchCapacities).length === 0) {
      showToast('Please add at least one branch before saving.', 'error');
      return;
    }
    try {
      await updateBatchCapacities({
        academic_year: targetBatch,
        branches: batchCapacities
      }, adminToken);
      showToast(`Saved Batch ${targetBatch} with ${Object.keys(batchCapacities).length} branches!`);
      onRefreshStats();
      const freshBatches = await fetchBatches().catch(() => []);
      if (freshBatches.length > 0) {
        setAvailableBatches(freshBatches);
        setCapacityBatchYear(targetBatch);
        setDriveBatch(targetBatch);
      }
    } catch (err) { showToast(err.message, 'error'); }
  };

  // Delete an entire Batch
  const handleDeleteBatch = async (batchYear) => {
    if (!window.confirm(`Are you sure you want to delete Batch ${batchYear}? Any drives recorded for this batch will also be deleted.`)) return;
    try {
      await deleteBatch(batchYear, adminToken);
      showToast(`Deleted Batch ${batchYear}.`);
      setAvailableBatches(prev => prev.filter(b => b.academic_year !== batchYear));
      const remaining = availableBatches.filter(b => b.academic_year !== batchYear);
      if (remaining.length > 0) {
        setDriveBatch(remaining[0].academic_year);
        setCapacityBatchYear(remaining[0].academic_year);
      } else {
        setDriveBatch('');
        setCapacityBatchYear('');
        setIsCreatingNewBatch(true);
      }
      onRefreshStats();
    } catch (err) { showToast(err.message, 'error'); }
  };

  // Reset database drives to 0
  const handleResetWholeDb = async () => {
    if (!window.confirm('Reset whole database to 0? All placement drives and batches will be completely wiped so you can start fresh.')) return;
    try {
      await resetDatabase(adminToken);
      showToast('Database wiped clean to 0!');
      setAvailableBatches([]);
      setDriveBatch('');
      setCapacityBatchYear('');
      setIsCreatingNewBatch(true);
      setBranchHires({});
      setBatchCapacities({});
      onRefreshStats();
    } catch (err) { showToast(err.message, 'error'); }
  };

  // Change Admin Passcode Handler
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPasscode || !passwordForm.newPasscode) {
      showToast('Please fill out all passcode fields.', 'error');
      return;
    }
    if (passwordForm.newPasscode.trim().length < 4) {
      showToast('New passcode must be at least 4 characters long.', 'error');
      return;
    }
    if (passwordForm.newPasscode !== passwordForm.confirmPasscode) {
      showToast('New passcode confirmation does not match.', 'error');
      return;
    }
    setIsChangingPassword(true);
    try {
      await changeAdminPasscode(passwordForm.currentPasscode, passwordForm.newPasscode, adminToken);
      showToast('Admin passcode updated successfully! Session refreshed.');
      onAdminLogin(passwordForm.newPasscode);
      setPasswordForm({ currentPasscode: '', newPasscode: '', confirmPasscode: '' });
      setActiveTab('add_placement');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ---------- 1. LOGIN SCREEN (ALWAYS ASKED BEFORE ENTERING) ----------
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Admin Authentication</h1>
        <p className="text-xs text-slate-500 mt-2 mb-6">Enter the administrative passcode to access data management.</p>
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-left text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Passcode</label>
            <input
              type="password"
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              autoFocus
              required
            />
          </div>
          {loginError && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-rose-600 text-xs font-semibold p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
              <div className="text-left text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
                Troubleshoot: <a href="/api/health" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline">Click here to check backend connection status</a>. Default passcode is <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-300 font-bold">admin123</code>.
              </div>
            </div>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
          >
            Unlock Portal
          </button>
          <p className="text-[11px] text-slate-400">Default passcode: <span className="font-mono font-bold text-slate-600">admin123</span></p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => { window.location.hash = ''; }}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              &larr; Back to Public Placement Stats
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ---------- 2. ADMIN DASHBOARD ----------
  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold ${
          notification.type === 'error' ? 'bg-rose-900 text-white border-rose-800' : 'bg-slate-900 text-emerald-400 border-slate-800'}`}>
          {notification.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" /> : <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Unlock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Admin Console — IIT Patna</h1>
            <p className="text-xs text-slate-400 mt-0.5">Enter placement data manually. Create batches and branches on demand.</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('change_password')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              activeTab === 'change_password'
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
            }`}
            title="Change Admin Passcode"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Passcode</span>
          </button>
          <button
            onClick={handleResetWholeDb}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-xs font-semibold border border-slate-700 hover:border-rose-700 transition-colors cursor-pointer"
            title="Wipe database to zero"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset DB to 0</span>
          </button>
          <button
            onClick={onAdminLogout}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock & Exit</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto text-sm font-semibold">
        {[
          { id: 'add_placement', icon: PlusCircle, label: 'Add Placement Drive' },
          { id: 'manage_drives', icon: Layers, label: `Manage Drives (${(placementStats?.all_drives || []).length})` },
          { id: 'batch_capacities', icon: Sliders, label: `Batches & Branches (${availableBatches.length})` },
          { id: 'change_password', icon: KeyRound, label: 'Change Passcode' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: ADD PLACEMENT DRIVE                                    */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'add_placement' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Record New Placement / PPO Offer</h2>
              <p className="text-xs text-slate-500">Insert company, package, offer type, and branch-wise student hires.</p>
            </div>

            {/* Batch Selector with "+ New Batch" option */}
            <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 px-1 uppercase tracking-wider">Batch:</span>
              {!isCreatingNewBatch && availableBatches.length > 0 ? (
                <div className="flex items-center space-x-1.5">
                  <select
                    value={driveBatch}
                    onChange={(e) => setDriveBatch(e.target.value)}
                    className="bg-white text-xs font-bold text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden cursor-pointer"
                  >
                    {availableBatches.map(b => (
                      <option key={b.academic_year} value={b.academic_year}>
                        Batch {b.academic_year}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewBatch(true);
                      setNewBatchName('');
                    }}
                    className="px-2 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 flex items-center space-x-1 cursor-pointer"
                    title="Add a new academic year batch"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Batch</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    placeholder="Batch (e.g. 2025-2026)"
                    value={newBatchName}
                    onChange={(e) => setNewBatchName(e.target.value)}
                    className="w-36 text-xs font-bold px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg focus:outline-hidden"
                  />
                  {availableBatches.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewBatch(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handlePlacementSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Company Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Google, Microsoft, Qualcomm"
                  value={placementForm.company_name}
                  onChange={(e) => setPlacementForm({ ...placementForm, company_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Job Role / Profile *</label>
                <input
                  type="text"
                  placeholder="e.g. SDE-1, Systems Engineer, Analyst"
                  value={placementForm.role}
                  onChange={(e) => setPlacementForm({ ...placementForm, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">CTC Package (in LPA) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 28.5"
                  value={placementForm.ctc}
                  onChange={(e) => setPlacementForm({ ...placementForm, ctc: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Offer Type *</label>
                <select
                  value={placementForm.offer_type}
                  onChange={(e) => setPlacementForm({ ...placementForm, offer_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden bg-slate-50 cursor-pointer font-medium"
                >
                  <option value="FTE">Direct Full-Time (FTE)</option>
                  <option value="PPO">Pre-Placement Offer (PPO)</option>
                  <option value="6M+PPO">6-Month Intern + PPO</option>
                </select>
              </div>
            </div>

            {/* Branch-Wise Hires Grid with Add Branch */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Branch-Wise Hires</h3>
                  <p className="text-xs text-slate-500">Enter number of students placed from each branch</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Inline Add Branch Widget */}
                  <div className="flex items-center space-x-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
                    <input
                      type="text"
                      placeholder="Branch (e.g. CSE, MnC)"
                      value={newBranchInput}
                      onChange={(e) => setNewBranchInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBranchToDrive(e); } }}
                      className="w-36 text-xs px-2.5 py-1.5 rounded-lg focus:outline-hidden uppercase font-semibold text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddBranchToDrive}
                      className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Branch</span>
                    </button>
                  </div>

                  {/* Total counter */}
                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-slate-500">Total Hires:</span>
                    <span className="ml-1.5 text-base font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      {totalHires}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Branch Inputs Grid */}
              {Object.keys(branchHires).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.keys(branchHires).map(branch => (
                    <div key={branch} className="bg-white p-3 rounded-xl border border-slate-200 text-center relative group shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleRemoveBranchFromDrive(branch)}
                        className="absolute top-1.5 right-1.5 text-slate-300 hover:text-rose-500 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title={`Remove ${branch}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-extrabold text-slate-700 block mb-1">{branch}</span>
                      <input
                        type="number"
                        min="0"
                        value={branchHires[branch] || 0}
                        onChange={(e) => setBranchHires({
                          ...branchHires,
                          [branch]: Math.max(0, parseInt(e.target.value) || 0)
                        })}
                        className="w-full text-center py-1.5 rounded-lg border border-slate-200 font-bold text-slate-900 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-white rounded-xl border border-dashed border-slate-300 text-center">
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    No branches added yet for this drive.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const common = { 'CSE': 0, 'AI': 0, 'MNC': 0, 'ECE': 0, 'EE': 0, 'ME': 0, 'CE': 0 };
                      setBranchHires(common);
                      showToast('Added common IIT Patna branches! Enter hires for relevant branches.');
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-200 cursor-pointer inline-flex items-center space-x-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>+ Add Common Branches (CSE, AI, MNC, ECE, EE, ME, CE)</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Notes (Optional)</label>
              <textarea
                rows="2"
                placeholder="Any special remarks..."
                value={placementForm.notes}
                onChange={(e) => setPlacementForm({ ...placementForm, notes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
              <span>{isSubmitting ? 'Recording Drive...' : 'Add Drive & Refresh Dashboard'}</span>
            </button>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: MANAGE EXISTING DRIVES                                 */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'manage_drives' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recorded Placement Drives</h2>
              <p className="text-xs text-slate-500">Live entries driving the calculations (visible only to admin)</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
              {(placementStats?.all_drives || []).length} Drives
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-6">Company</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Offer Type</th>
                  <th className="py-3 px-4 text-center">CTC (LPA)</th>
                  <th className="py-3 px-4 text-center">Hires</th>
                  <th className="py-3 px-6">Branch Distribution</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(placementStats?.all_drives || []).length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400 text-sm">
                      No drives in database. Use "Add Placement Drive" above to insert your first record.
                    </td>
                  </tr>
                ) : (
                  (placementStats?.all_drives || []).map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-6 font-bold text-slate-900">{d.company_name}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">{d.role}</td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">{d.academic_year}</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          d.offer_type === 'FTE' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          d.offer_type === 'PPO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {d.offer_type || 'FTE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-900">₹{d.ctc} LPA</td>
                      <td className="py-3.5 px-4 text-center font-bold text-indigo-600">{d.total_hires}</td>
                      <td className="py-3.5 px-6">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(d.branch_hires || {}).filter(([_, h]) => Number(h) > 0).map(([b, c]) => (
                            <span key={b} className="text-[10px] font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                              {b}:{c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteDrive(d.id, d.company_name)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: BATCHES & BRANCHES CONFIGURATION                       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'batch_capacities' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Batches & Branches Configuration</h2>
              <p className="text-xs text-slate-500">Configure batches, add new branches, and adjust student capacities for exact % placement calculations.</p>
            </div>

            {/* Quick delete batch button */}
            {availableBatches.length > 0 && capacityBatchYear && (
              <button
                type="button"
                onClick={() => handleDeleteBatch(capacityBatchYear)}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 cursor-pointer flex items-center space-x-1"
                title={`Delete Batch ${capacityBatchYear}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Batch {capacityBatchYear}</span>
              </button>
            )}
          </div>

          <form onSubmit={handleBatchSubmit} className="space-y-6">
            {/* Step 1: Batch Academic Year */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Step 1: Select or Create Batch</h3>
              
              <div className="flex flex-wrap items-center gap-4">
                {availableBatches.length > 0 ? (
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Batch:
                    </label>
                    <select
                      value={capacityBatchYear}
                      onChange={(e) => setCapacityBatchYear(e.target.value)}
                      className="px-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden cursor-pointer"
                    >
                      {availableBatches.map(b => (
                        <option key={b.academic_year} value={b.academic_year}>
                          Batch {b.academic_year}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Batch Year *:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2025-2026"
                      value={capacityBatchYear}
                      onChange={(e) => setCapacityBatchYear(e.target.value)}
                      className="w-44 px-3 py-2 text-sm font-bold bg-white border border-indigo-400 rounded-xl focus:outline-hidden"
                      required
                    />
                  </div>
                )}

                {/* Create additional batch */}
                {availableBatches.length > 0 && (
                  <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
                    <input
                      type="text"
                      placeholder="New Batch (e.g. 2026-2027)"
                      value={newBatchName}
                      onChange={(e) => setNewBatchName(e.target.value)}
                      className="w-44 px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewBatch}
                      className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 cursor-pointer flex items-center space-x-1"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Create</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Add Branches Widget & Student Capacities */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Step 2: Add Branches & Student Capacities {capacityBatchYear ? `(Batch ${capacityBatchYear})` : ''}
                  </h3>
                  <p className="text-xs text-slate-500">Add branches and enter the total eligible students for each branch</p>
                </div>

                <button
                  type="button"
                  onClick={handlePopulateStandardBranches}
                  className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl cursor-pointer flex items-center space-x-1 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load Preset Branches</span>
                </button>
              </div>

              {/* Clear, well-labeled Add Branch Form */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Branch Code / Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CSE, MnC, AI, ECE, ME"
                    value={newCapacityBranchInput}
                    onChange={(e) => setNewCapacityBranchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBranchToCapacity(e); } }}
                    className="w-full text-sm font-bold uppercase px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="w-full sm:w-36">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Students Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 80"
                    value={newCapacityBranchCount}
                    onChange={(e) => setNewCapacityBranchCount(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBranchToCapacity(e); } }}
                    className="w-full text-sm font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden text-center"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddBranchToCapacity}
                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl cursor-pointer flex items-center justify-center space-x-1.5 transition-colors shrink-0 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Branch</span>
                </button>
              </div>

              {/* Branch Cards Grid */}
              {Object.keys(batchCapacities).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.keys(batchCapacities).map(b => (
                    <div key={b} className="p-3 rounded-xl border border-slate-200 bg-white text-center relative group shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleRemoveBranchFromCapacity(b)}
                        className="absolute top-1.5 right-1.5 text-slate-300 hover:text-rose-500 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title={`Remove ${b}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-extrabold text-slate-700 block mb-1">{b}</span>
                      <input
                        type="number"
                        min="1"
                        value={batchCapacities[b] || 0}
                        onChange={(e) => setBatchCapacities({
                          ...batchCapacities,
                          [b]: Math.max(1, parseInt(e.target.value) || 0)
                        })}
                        className="w-full text-center py-1.5 rounded-lg border border-slate-200 font-extrabold text-slate-900 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-indigo-500 text-sm"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-white rounded-xl border border-dashed border-slate-300 text-center text-xs font-semibold text-slate-400">
                  No branches added yet. Enter a branch name above (e.g. CSE) and click "Add Branch", or click "Load Preset Branches".
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>Total Eligible Students {capacityBatchYear ? `for Batch ${capacityBatchYear}` : ''}:</span>
                <span className="text-sm font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                  {Object.values(batchCapacities).reduce((a, b) => a + Number(b || 0), 0)} Students
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
            >
              Save Batch & Branches
            </button>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: CHANGE ADMIN PASSCODE                                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'change_password' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs max-w-xl mx-auto space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-3">
              <KeyRound className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Change Admin Passcode</h2>
            <p className="text-xs text-slate-500 mt-1">
              Update the administrative secret key required to access the admin portal.
            </p>
          </div>

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Current Passcode *
              </label>
              <input
                type="password"
                placeholder="Enter current passcode"
                value={passwordForm.currentPasscode}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPasscode: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                New Passcode *
              </label>
              <input
                type="password"
                placeholder="At least 4 characters"
                value={passwordForm.newPasscode}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPasscode: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm New Passcode *
              </label>
              <input
                type="password"
                placeholder="Re-enter new passcode"
                value={passwordForm.confirmPasscode}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPasscode: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2.5 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Your passcode will take effect immediately. Keep it private. You will use it whenever entering through <code className="text-indigo-600 font-bold bg-white px-1 py-0.5 rounded border border-slate-200">#tpc_bkl</code>.
              </span>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isChangingPassword ? 'Updating Passcode...' : 'Update Passcode'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasswordForm({ currentPasscode: '', newPasscode: '', confirmPasscode: '' });
                  setActiveTab('add_placement');
                }}
                className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
