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

export default function VpnPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState('expressvpn-1m');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [fullName, setFullName] = useState<string>('User');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [vpnAccount, setVpnAccount] = useState<any>(null);

  // Define selling prices (Retail Price = Wholesale Cost + Your Profit)
  const plans = [
    { id: 'expressvpn-1m', name: 'ExpressVPN (1 Month)', price: 3500, duration: 1 },
    { id: 'nordvpn-1m', name: 'NordVPN (1 Month)', price: 2800, duration: 1 },
    { id: 'surfshark-1m', name: 'Surfshark (1 Month)', price: 2500, duration: 1 },
    { id: 'windscribe-1m', name: 'Windscribe Pro (1 Month)', price: 2200, duration: 1 },
  ];

  const currentPlanObj = plans.find(p => p.id === selectedPlan) || plans[0];

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
    setVpnAccount(null);

    if (walletBalance < currentPlanObj.price) {
      setErrorMsg(`Insufficient wallet balance. You need ₦${currentPlanObj.price.toLocaleString()} but have ₦${walletBalance.toLocaleString()}.`);
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/vtu/buy-vpn', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          planId: currentPlanObj.id,
          durationMonths: currentPlanObj.duration,
          amount: currentPlanObj.price,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(data.message);
        setVpnAccount(data.credentials);
        fetchUserData();
      } else {
        setErrorMsg(data.message || 'Transaction failed. Please try again.');
      }
    } catch (err: any) {
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>🛡️</span> VPN Premium Accounts
            </h3>

            {errorMsg && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">
                {successMsg}
              </div>
            )}

            <form onSubmit={handlePurchase} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Package</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {plans.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlan(p.id)}
                      className={`p-4 text-left rounded-xl border transition ${
                        selectedPlan === p.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-bold text-gray-900 text-sm">{p.name}</div>
                      <div className="text-blue-600 font-extrabold text-sm mt-1">₦{p.price.toLocaleString()}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center border border-gray-100">
                <span className="text-sm font-semibold text-gray-600">Total Price:</span>
                <span className="text-lg font-extrabold text-gray-900">₦{currentPlanObj.price.toLocaleString()}</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3.5 px-4 rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm text-sm disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Purchase VPN Subscription'}
              </button>
            </form>

            {vpnAccount && (
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h4 className="font-bold text-blue-900 text-sm mb-2">Your VPN Access Credentials:</h4>
                <div className="bg-white p-3 rounded-lg border border-blue-100 text-sm font-mono text-gray-800 space-y-1">
                  <p><strong>Username/Email:</strong> {vpnAccount.username || vpnAccount.email || 'Provided in details'}</p>
                  <p><strong>Password/Key:</strong> {vpnAccount.password || vpnAccount.key || JSON.stringify(vpnAccount)}</p>
                </div>
              </div>
            )}
          </div>

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