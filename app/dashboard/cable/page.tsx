'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Bouquet {
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

export default function CablePage() {
  const router = useRouter();
  const [selectedProvider, setSelectedProvider] = useState('dstv');
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [verifying, setVerifying] = useState(false);

  const [bouquets, setBouquets] = useState<Bouquet[]>([]);
  const [fetchingBouquets, setFetchingBouquets] = useState(false);
  const [selectedBouquet, setSelectedBouquet] = useState('');

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [fullName, setFullName] = useState<string>('User');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  const fetchBouquets = async (provider: string) => {
    setFetchingBouquets(true);
    setSelectedBouquet('');
    setBouquets([]);
    try {
      const res = await fetch(`/api/vtu/cable-variations?serviceID=${provider}`);
      const data = await res.json();
      if (data.success) {
        setBouquets(data.variations);
      }
    } catch (err) {
      console.error('Error fetching bouquets:', err);
    } finally {
      setFetchingBouquets(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    fetchBouquets(selectedProvider);
  }, [selectedProvider]);

  const handleVerifySmartcard = async () => {
    if (!smartcardNumber) return;
    setVerifying(true);
    setErrorMsg('');
    setCustomerName('');

    try {
      const res = await fetch('/api/vtu/verify-cable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceID: selectedProvider, smartcardNumber }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCustomerName(data.customerName);
      } else {
        setErrorMsg(data.message || 'Verification failed');
      }
    } catch (err) {
      setErrorMsg('Failed to verify Smartcard number');
    } finally {
      setVerifying(false);
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const chosenBouquetObj = bouquets.find((b) => b.variation_code === selectedBouquet);
    if (!chosenBouquetObj) {
      setErrorMsg('Please select a valid bouquet');
      return;
    }

    const bouquetAmount = Number(chosenBouquetObj.variation_amount);

    if (walletBalance < bouquetAmount) {
      setErrorMsg(`Insufficient balance. You need ₦${bouquetAmount} but have ₦${walletBalance}.`);
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/vtu/buy-cable', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          serviceID: selectedProvider,
          smartcardNumber,
          variationCode: chosenBouquetObj.variation_code,
          amount: bouquetAmount,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert(`Success! Subscribed ${selectedProvider.toUpperCase()} for ${smartcardNumber}`);
        setSmartcardNumber('');
        setCustomerName('');
        setSelectedBouquet('');
        fetchUserData();
      } else {
        setErrorMsg(data.message || 'Subscription failed. Please try again.');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
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
              <span>📺</span> Cable TV Subscription
            </h3>

            {errorMsg && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handlePurchase} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Provider</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'dstv', label: 'DSTV' },
                    { id: 'gotv', label: 'GOTV' },
                    { id: 'startimes', label: 'Startimes' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setCustomerName('');
                        setSelectedProvider(p.id);
                      }}
                      className={`py-3 px-2 text-center rounded-xl font-bold border transition text-sm ${
                        selectedProvider === p.id
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Smartcard / IUC Number</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={smartcardNumber}
                    onChange={(e) => {
                      setSmartcardNumber(e.target.value);
                      setCustomerName('');
                    }}
                    placeholder="Enter Smartcard Number"
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleVerifySmartcard}
                    disabled={verifying || !smartcardNumber}
                    className="bg-gray-900 text-white font-semibold px-4 rounded-lg hover:bg-gray-800 transition text-sm disabled:opacity-50"
                  >
                    {verifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
                {customerName && (
                  <p className="mt-2 text-xs font-bold text-green-600 bg-green-50 p-2 rounded-md border border-green-200">
                    Account Name: {customerName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Package / Bouquet</label>
                <select
                  required
                  disabled={fetchingBouquets}
                  value={selectedBouquet}
                  onChange={(e) => setSelectedBouquet(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm bg-white disabled:bg-gray-100"
                >
                  <option value="">
                    {fetchingBouquets ? 'Loading bouquets...' : `-- Choose ${selectedProvider.toUpperCase()} Package --`}
                  </option>
                  {bouquets.map((b, idx) => (
                    <option key={`${b.variation_code}-${idx}`} value={b.variation_code}>
                      {b.name} - ₦{b.variation_amount}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading || fetchingBouquets}
                className="w-full bg-blue-600 text-white py-3.5 px-4 rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm text-sm disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Pay Subscription'}
              </button>
            </form>
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