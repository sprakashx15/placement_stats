import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import PlacementsPage from './pages/PlacementsPage';
import AdminPage from './pages/AdminPage';
import { fetchBatches, fetchPlacementStats } from './services/api';
import { GraduationCap, Lock } from 'lucide-react';

export default function App() {
  // Admin is a hidden page — only accessible via #tpc_bkl in URL
  const [showAdmin, setShowAdmin] = useState(() => window.location.hash === '#tpc_bkl');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [batches, setBatches] = useState([]);
  const [placementStats, setPlacementStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Require passcode every time user visits admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState('');

  // Clear any persistent tokens and track hash
  useEffect(() => {
    localStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_token');

    const onHash = () => {
      const isHashAdmin = window.location.hash === '#tpc_bkl';
      setShowAdmin(isHashAdmin);
      if (!isHashAdmin) {
        setIsAdmin(false);
        setAdminToken('');
      }
    };

    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const loadData = useCallback(async (yearToLoad) => {
    setIsLoading(true);
    setError(null);
    try {
      const year = yearToLoad !== undefined ? yearToLoad : selectedYear;
      const [batchList, pStats] = await Promise.all([
        fetchBatches().catch(() => []),
        fetchPlacementStats(year)
      ]);
      setBatches(batchList || []);
      setPlacementStats(pStats);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Unable to connect to backend. Make sure the server is running on port 5001.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => { loadData(selectedYear); }, [selectedYear, loadData]);

  const handleAdminLogin = (token) => {
    setIsAdmin(true);
    setAdminToken(token);
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setAdminToken('');
    window.location.hash = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <Navbar
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        batches={batches}
        onRefresh={() => loadData(selectedYear)}
        isLoading={isLoading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => loadData(selectedYear)}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {isLoading && !placementStats ? (
          <div className="py-32 text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-800">Loading Placement Data</h3>
            <p className="text-xs text-slate-400 mt-1">Aggregating placement metrics and branch analytics...</p>
          </div>
        ) : showAdmin ? (
          <AdminPage
            isAdmin={isAdmin}
            adminToken={adminToken}
            onAdminLogin={handleAdminLogin}
            onAdminLogout={handleAdminLogout}
            placementStats={placementStats}
            selectedYear={selectedYear}
            batches={batches}
            onRefreshStats={() => loadData(selectedYear)}
          />
        ) : (
          <PlacementsPage stats={placementStats} />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-800">Placement Stats IIT Patna</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
          <a
            href="#tpc_bkl"
            className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Admin Login Portal"
          >
            <Lock className="w-3.5 h-3.5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
