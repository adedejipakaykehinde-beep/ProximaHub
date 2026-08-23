'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Variation {
  variation_code: string;
  name: string;
  variation_amount: number;
  type?: string;
  duration?: string;
}

interface Transaction {
  id: string;
  type: string;
  details: string;
  amount: number;
  status: string;
  created_at: string;
}

// Bigisub Plan Catalog
const BIGISUB_PLANS: Record<string, Variation[]> = {
  MTN: [
    { variation_code: 'mtn-1gb-awoof', name: '1GB', variation_amount: 269, type: 'GIFTING', duration: '1 day Awoof' },
    { variation_code: 'mtn-1gb-sme', name: '1GB', variation_amount: 265, type: 'SME', duration: '30 Days' },
    { variation_code: 'mtn-20mb', name: '20MB', variation_amount: 25, type: 'GIFTING', duration: '1 day [FACEBOOK]' },
    { variation_code: 'mtn-200mb-soc', name: '200MB', variation_amount: 99, type: 'GIFTING', duration: '1 day [ALL SOCIAL]' },
    { variation_code: 'mtn-500mb-sme', name: '500MB', variation_amount: 135, type: 'SME', duration: '30 Days' },
    { variation_code: 'mtn-2gb-sme', name: '2GB', variation_amount: 530, type: 'SME', duration: '30 Days' },
    { variation_code: 'mtn-3gb-sme', name: '3GB', variation_amount: 795, type: 'SME', duration: '30 Days' },
    { variation_code: 'mtn-5gb-sme', name: '5GB', variation_amount: 1325, type: 'SME', duration: '30 Days' },
    { variation_code: 'mtn-10gb-sme', name: '10GB', variation_amount: 2650, type: 'SME', duration: '30 Days' },
  ],
  Airtel: [
    { variation_code: 'airtel-100mb', name: '100MB', variation_amount: 100, type: 'GIFTING', duration: '1 Day' },
    { variation_code: 'airtel-300mb', name: '300MB', variation_amount: 200, type: 'GIFTING', duration: '2 Days' },
    { variation_code: 'airtel-1gb', name: '1GB', variation_amount: 300, type: 'GIFTING', duration: '1 Day' },
    { variation_code: 'airtel-2gb', name: '2GB', variation_amount: 600, type: 'GIFTING', duration: '2 Days' },
    { variation_code: 'airtel-5gb', name: '5GB', variation_amount: 1500, type: 'CG', duration: '14 Days' },
  ],
  Glo: [
    { variation_code: 'glo-200mb', name: '200MB', variation_amount: 100, type: 'GIFTING', duration: '1 Day' },
    { variation_code: 'glo-1gb', name: '1GB', variation_amount: 280, type: 'CG', duration: '30 Days' },
    { variation_code: 'glo-2gb', name: '2GB', variation_amount: 560, type: 'CG', duration: '30 Days' },
    { variation_code: 'glo-3gb', name: '3GB', variation_amount: 840, type: 'CG', duration: '30 Days' },
  ],
  '9mobile': [
    { variation_code: '9mob-1gb', name: '1GB', variation_amount: 220, type: 'SME', duration: '30 Days' },
    { variation_code: '9mob-2gb', name: '2GB', variation_amount: 440, type: 'SME', duration: '30 Days' },
    { variation_code: '9mob-5gb', name: '5GB', variation_amount: 1100, type: 'SME', duration: '30 Days' },
  ],
};

export default function DashboardPage() {
  const router = useRouter();
  const [selectedNetwork, setSelectedNetwork] = useState('MTN');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPlanCode, setSelectedPlanCode] = useState('');
  const [variations, setVariations] = useState<Variation[]>(BIGISUB_PLANS['MTN']);
  const [fetchingPlans, setFetchingPlans] = useState(false);
  
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [fullName, setFullName] = useState<string>('User');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, wallet_balance')
      .eq('id', user.id)
      .single();

    if (profile) {
      setFullName(profile.full_name || 'User');
      setWalletBalance(profile.wallet_balance || 0);
    }

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

  const loadNetworkPlans = async (network: string) => {
    setFetchingPlans(true);
    setSelectedPlanCode('');
    setErrorMsg('');
    
    try {
      const res = await fetch(`/api/vtu/variations?network=${network.toLowerCase()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.variations) && data.variations.length > 0) {
          setVariations(data.variations);
          setFetchingPlans(false);
          return;
        }
      }
    } catch (err) {
      console.log('Using local Bigisub catalog');
    }

    setVariations(BIGISUB_PLANS[network] || []);
    setFetchingPlans(false);
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    loadNetworkPlans(selectedNetwork);
  }, [selectedNetwork]);

  const handleNetworkChange = (network: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setSelectedNetwork(network);
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!phoneNumber || phoneNumber.length < 11) {
      setErrorMsg('Please enter a valid 11-digit phone number');
      return;
    }

    const chosenPlan = variations.find((v) => v.variation_code === selectedPlanCode);
    if (!chosenPlan) {
      setErrorMsg('Please select a data plan card below');
      return;
    }

    const planAmount = Number(chosenPlan.variation_amount);

    if (walletBalance < planAmount) {
      setErrorMsg(`Insufficient wallet balance. You need ₦${planAmount} but have ₦${walletBalance}.`);
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/vtu/buy-data', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          network: selectedNetwork,
          planId: chosenPlan.variation_code,
          phoneNumber,
          amount: planAmount,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(`Successfully processed ${selectedNetwork} ${chosenPlan.name} for ${phoneNumber}!`);
        setPhoneNumber('');
        setSelectedPlanCode('');
        fetchUserData();
      } else {
        setErrorMsg(data.message || 'Transaction failed. Please check your network or wallet balance.');
      }
    } catch (err: any) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-600/30">
                P
              </div>
              <span className="text-xl font-bold text-white tracking-tight">ProximaHub</span>
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400 font-medium hidden sm:inline">
                Welcome back, <strong className="text-white">{fullName}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 rounded-xl transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 border border-blue-500/20 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">Wallet Balance</p>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <Link
              href="/dashboard/fund-wallet"
              className="bg-white text-blue-600 font-extrabold px-6 py-3.5 rounded-2xl hover:bg-blue-50 transition shadow-lg text-sm hover:scale-105"
            >
              + Fund Wallet
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-slate-800/60 rounded-3xl border border-slate-700/60 p-6 sm:p-8 shadow-xl backdrop-blur-sm">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">📶</span> Buy Data Bundle
            </h3>

            {errorMsg && (
              <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-2xl text-sm font-medium">
                ⚠️ {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl text-sm font-medium">
                ✅ {successMsg}
              </div>
            )}

            <form onSubmit={handlePurchase} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Select Network Provider
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {['MTN', 'Glo', 'Airtel', '9mobile'].map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => handleNetworkChange(net)}
                      className={`py-3.5 px-2 rounded-2xl font-black text-sm border transition-all ${
                        selectedNetwork === net
                          ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-[1.02]'
                          : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Recipient Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="08012345678"
                  className="w-full px-5 py-4 rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Select Data Plan
                </label>
                
                {fetchingPlans ? (
                  <div className="text-center py-8 text-slate-500">Loading plans...</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {variations.map((plan) => {
                      const isSelected = selectedPlanCode === plan.variation_code;
                      return (
                        <div
                          key={plan.variation_code}
                          onClick={() => setSelectedPlanCode(plan.variation_code)}
                          className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-blue-500 bg-blue-600/20 text-white ring-2 ring-blue-500 shadow-md'
                              : 'border-slate-700/80 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-900'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-lg font-black text-white">{plan.name}</span>
                              {plan.type && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 uppercase">
                                  {plan.type}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-medium mb-3">{plan.duration || '30 Days'}</p>
                          </div>
                          <div className="text-base font-black text-blue-400">
                            ₦{plan.variation_amount}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !selectedPlanCode}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 px-6 rounded-2xl font-black shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.01] text-base disabled:opacity-40 disabled:hover:scale-100"
              >
                {loading ? 'Processing Order...' : 'Buy Data Now'}
              </button>
            </form>
          </div>

          <div className="bg-slate-800/60 rounded-3xl border border-slate-700/60 p-6 shadow-xl backdrop-blur-sm h-fit">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
              <Link href="/dashboard/transactions" className="text-xs text-blue-400 font-bold hover:underline">
                View All
              </Link>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-xs font-semibold">No recent transactions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-3.5 bg-slate-900/60 rounded-2xl border border-slate-700/40">
                    <div>
                      <p className="text-xs font-bold text-white">{tx.details}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-black ${tx.type === 'funding' ? 'text-emerald-400' : 'text-slate-200'}`}>
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