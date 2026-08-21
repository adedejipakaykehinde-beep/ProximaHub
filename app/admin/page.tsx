'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  wallet_balance: number | null;
  role?: string;
  created_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  details: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fund/Debit modal state
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundType, setFundType] = useState<'credit' | 'debit'>('credit');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    
    // 1. Check active user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // 2. Strict Security Check: Verify Admin Role
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      alert('Access Denied: You do not have administrator permissions.');
      router.push('/dashboard');
      return;
    }

    // 3. Fetch all user profiles
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersData) {
      setProfiles(usersData);
    }

    // 4. Fetch all transactions
    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (txData) {
      setTransactions(txData);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleWalletAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !fundAmount) return;

    const amountNum = parseFloat(fundAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    setActionLoading(true);

    const currentBal = selectedUser.wallet_balance || 0;
    const newBal = fundType === 'credit' ? currentBal + amountNum : currentBal - amountNum;

    if (fundType === 'debit' && newBal < 0) {
      alert('Cannot debit below ₦0 balance.');
      setActionLoading(false);
      return;
    }

    // Update user balance
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBal })
      .eq('id', selectedUser.id);

    if (updateErr) {
      alert(`Error: ${updateErr.message}`);
      setActionLoading(false);
      return;
    }

    // Record transaction
    await supabase.from('transactions').insert([
      {
        user_id: selectedUser.id,
        type: fundType === 'credit' ? 'admin_credit' : 'admin_debit',
        details: `Admin ${fundType === 'credit' ? 'credited' : 'debited'} ₦${amountNum.toLocaleString()}`,
        amount: amountNum,
        status: 'success',
      },
    ]);

    alert(`Successfully ${fundType === 'credit' ? 'credited' : 'debited'} ₦${amountNum} for ${selectedUser.full_name || selectedUser.email}`);
    setSelectedUser(null);
    setFundAmount('');
    setActionLoading(false);
    fetchAdminData();
  };

  const filteredProfiles = profiles.filter((p) =>
    (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSystemBalance = profiles.reduce((acc, curr) => acc + (curr.wallet_balance || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white">
              A
            </div>
            <span className="font-bold text-lg tracking-wide">ProximaHub Admin</span>
          </div>
          <Link href="/dashboard" className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg transition font-semibold">
            User Dashboard →
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Total Users</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-2">{profiles.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Total User Balances</p>
            <p className="text-3xl font-extrabold text-blue-600 mt-2">₦{totalSystemBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Total Transactions Logged</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">{transactions.length}</p>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">User Accounts</h2>
              <p className="text-xs text-gray-500">Manage balances and view registered accounts</p>
            </div>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-64 focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Wallet Balance</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No users found</td>
                    </tr>
                  ) : (
                    filteredProfiles.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-semibold text-gray-900">{user.full_name || 'N/A'}</td>
                        <td className="px-6 py-4">{user.email || 'N/A'}</td>
                        <td className="px-6 py-4 font-bold text-emerald-600">
                          ₦{(user.wallet_balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition"
                          >
                            Adjust Balance
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transactions Log */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Recent System Transactions</h2>
            <p className="text-xs text-gray-500">Real-time log of airtime, data, cable, and electricity orders</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Details</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No transactions recorded yet</td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-bold uppercase text-xs text-gray-800">{tx.type}</td>
                      <td className="px-6 py-4">{tx.details}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">₦{tx.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Adjust Balance Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Adjust Wallet Balance</h3>
            <p className="text-xs text-gray-500">
              User: <span className="font-semibold text-gray-800">{selectedUser.full_name || selectedUser.email}</span>
            </p>
            <p className="text-xs text-gray-500">
              Current Balance: <span className="font-bold text-emerald-600">₦{(selectedUser.wallet_balance || 0).toLocaleString()}</span>
            </p>

            <form onSubmit={handleWalletAdjustment} className="space-y-4 pt-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFundType('credit')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                    fundType === 'credit' ? 'bg-emerald-50 text-emerald-600 border-emerald-500' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  + Credit User
                </button>
                <button
                  type="button"
                  onClick={() => setFundType('debit')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                    fundType === 'debit' ? 'bg-red-50 text-red-600 border-red-500' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  - Debit User
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}