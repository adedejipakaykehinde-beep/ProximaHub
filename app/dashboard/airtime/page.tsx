'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Transaction {
  id: string;
  type: string;
  details: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function AirtimePage() {
  const router = useRouter();
  const [selectedNetwork, setSelectedNetwork] = useState('MTN');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('100');
  
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

  useEffect(() => {
    fetchUserData();
  }, []);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!phoneNumber || phoneNumber.length < 11) {
      setErrorMsg('Please enter a valid 11-digit phone number');
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount < 25) {
      setErrorMsg('Minimum airtime amount is ₦25');
      return;
    }

    if (walletBalance < numAmount) {
      setErrorMsg(`Insufficient wallet balance. You need ₦${numAmount} but have ₦${walletBalance}.`);
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      if (!currentUserId) {
        setErrorMsg('Authentication session expired. Please log in again.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/vtu/buy-airtime', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          userId: currentUserId,
          network: selectedNetwork,
          phoneNumber,
          amount: numAmount,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(`Successfully credited ₦${numAmount} ${selectedNetwork} airtime to ${phoneNumber}!`);
        setPhoneNumber('');
        fetchUserData();
      } else {
        setErrorMsg(data.message || 'Transaction failed. Please try again.');
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
              <span className="text-2xl">📱</span> Buy Airtime
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
                  Select Network
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {['MTN', 'Glo', 'Airtel', '9mobile'].map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => setSelectedNetwork(net)}
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
                  Phone Number
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  min="25"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  className="w-full px-5 py-4 rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 px-6 rounded-2xl font-black shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.01] text-base disabled:opacity-40 disabled:hover:scale-100"
              >
                {loading ? 'Processing Airtime...' : 'Buy Airtime Now'}
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