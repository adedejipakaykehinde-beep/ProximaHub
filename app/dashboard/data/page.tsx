'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Variation {
  variation_code: string;
  name: string;
  variation_amount: string;
}

interface Transaction {
  id: string;
  type: string;
  details: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [selectedNetwork, setSelectedNetwork] = useState('MTN');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [variations, setVariations] = useState<Variation[]>([]);
  const [fetchingPlans, setFetchingPlans] = useState(false);
  
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [fullName, setFullName] = useState<string>('User');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchUserData = async () => {
    // Get session to keep token fresh and prevent session expiration issues
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      router.push('/login');
      return;
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, wallet_balance')
      .eq('id', user.id)
      .single();

    if (profile) {
      setFullName(profile.full_name || 'User');
      setWalletBalance(profile.wallet_balance || 0);
    }

    // Fetch recent transactions
    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (txData) {
      setTransactions(txData);
    }
  };

  // Fetch variations dynamically based on the selected network
  const fetchVariations = async (network: string) => {
    setFetchingPlans(true);
    setSelectedPlan('');
    setVariations([]);
    try {
      const res = await fetch(`/api/vtu/variations?network=${network.toLowerCase()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.variations)) {
        setVariations(data.variations);
      } else {
        setErrorMsg('Failed to load plans for ' + network);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      setErrorMsg('Error loading data plans');
    } finally {
      setFetchingPlans(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    fetchVariations(selectedNetwork);
  }, [selectedNetwork]);

  const handleNetworkChange = (network: string) => {
    setErrorMsg('');
    setSelectedNetwork(network);
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const chosenPlanObj = variations.find((v) => v.variation_code === selectedPlan);
    if (!chosenPlanObj) {
      setErrorMsg('Please select a valid data plan');
      return;
    }

    const planAmount = Number(chosenPlanObj.variation_amount);

    if (walletBalance < planAmount) {
      setErrorMsg(`Insufficient wallet balance. You need ₦${planAmount} but have ₦${walletBalance}.`);
      return;
    }

    setLoading(true);

    try {
      // Get current auth session to attach bearer token
      const { data: { session } } = await supabase.auth.getSession();

      // Call secure backend API route
      const res = await fetch('/api/vtu/buy-data', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          network: selectedNetwork,
          planId: chosenPlanObj.variation_code,
          phoneNumber,
          amount: planAmount,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert(`Success! Purchased ${selectedNetwork} ${chosenPlanObj.name} for ${phoneNumber}`);
        setPhoneNumber('');
        setSelectedPlan('');
        fetchUserData(); // Refresh balance and transaction log safely
      } else {
        setErrorMsg(data.message || 'Transaction failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Purchase error:', err);
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-gray-900">ProximaHub</span>
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 font-medium hidden sm:inline">
                Welcome back, <strong className="text-gray-900">{fullName}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Wallet Balance</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                ₦ {walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <Link
              href="/dashboard/fund-wallet"
              className="bg-white text-blue-700 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition shadow-sm text-sm"
            >
              + Fund Wallet
            </Link>
          </div>
        </div>

        {/* Purchase Data & Sidebar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Data Purchase Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>📶</span> Buy Data Bundle
            </h3>

            {errorMsg && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handlePurchase} className="space-y-6">
              {/* Select Network */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Network</label>
                <div className="grid grid-cols-4 gap-3">
                  {['MTN', 'Airtel', 'Glo', '9mobile'].map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => handleNetworkChange(net)}
                      className={`py-3 px-2 text-center rounded-xl font-bold border transition text-sm ${
                        selectedNetwork === net
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone Number Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="08012345678"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm"
                />
              </div>

              {/* Dynamic Data Plan Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Plan</label>
                <select
                  required
                  disabled={fetchingPlans}
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm bg-white disabled:bg-gray-100"
                >
                  <option value="">
                    {fetchingPlans ? 'Loading plans...' : `-- Choose ${selectedNetwork} Data Plan --`}
                  </option>
                  {variations.map((plan, idx) => (
                    <option key={`${plan.variation_code}-${idx}`} value={plan.variation_code}>
                      {plan.name} - ₦{plan.variation_amount}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || fetchingPlans}
                className="w-full bg-blue-600 text-white py-3.5 px-4 rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm text-sm disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Purchase Now'}
              </button>
            </form>
          </div>

          {/* Right Side Panel - Recent Transactions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
              <Link href="/dashboard/transactions" className="text-xs text-blue-600 font-semibold hover:underline">
                View All
              </Link>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-sm">No recent transactions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition border border-gray-50">
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{tx.details}</p>
                      <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-bold ${tx.type === 'funding' ? 'text-green-600' : 'text-gray-900'}`}>
                      {tx.type === 'funding' ? '+' : '-'}₦{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}