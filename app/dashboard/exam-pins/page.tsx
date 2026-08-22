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

export default function ExamPinsPage() {
  const router = useRouter();
  const [selectedExam, setSelectedExam] = useState<'waec' | 'neco' | 'nabteb'>('waec');
  const [quantity, setQuantity] = useState<number>(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [fullName, setFullName] = useState<string>('User');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [purchasedCards, setPurchasedCards] = useState<any[]>([]);

  // Prices per pin (Adjust your selling prices here)
  const prices: Record<string, number> = {
    waec: 3800,
    neco: 1200,
    nabteb: 1100,
  };

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

  const totalCost = (prices[selectedExam] || 3800) * quantity;

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setPurchasedCards([]);

    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    const phoneRegex = /^0(70|80|81|90|91)\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setErrorMsg('Please enter a valid 11-digit Nigerian phone number (e.g. 08012345678)');
      return;
    }

    if (walletBalance < totalCost) {
      setErrorMsg(`Insufficient wallet balance. You need ₦${totalCost.toLocaleString()} but have ₦${walletBalance.toLocaleString()}.`);
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/vtu/buy-exam-pin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          examType: selectedExam,
          quantity: quantity,
          amount: prices[selectedExam],
          phoneNumber: cleanPhone,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(`Successfully purchased ${quantity} ${selectedExam.toUpperCase()} pin(s)!`);
        if (data.cards) setPurchasedCards(data.cards);
        setPhoneNumber('');
        setQuantity(1);
        fetchUserData();
      } else {
        setErrorMsg(data.message || 'Transaction failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Exam pin error:', err);
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
              <span>🎓</span> Buy Exam Pins
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Exam Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'waec', label: 'WAEC', price: prices.waec },
                    { id: 'neco', label: 'NECO', price: prices.neco },
                    { id: 'nabteb', label: 'NABTEB', price: prices.nabteb },
                  ].map((exam) => (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setSelectedExam(exam.id as any);
                      }}
                      className={`py-3 px-2 text-center rounded-xl font-bold border transition text-sm flex flex-col items-center justify-center ${
                        selectedExam === exam.id
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span>{exam.label}</span>
                      <span className="text-xs font-normal text-gray-500 mt-1">₦{exam.price.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={5}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number (For SMS Delivery)</label>
                <input
                  type="tel"
                  required
                  maxLength={11}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="08012345678"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center border border-gray-100">
                <span className="text-sm font-semibold text-gray-600">Total Price:</span>
                <span className="text-lg font-extrabold text-gray-900">₦{totalCost.toLocaleString()}</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3.5 px-4 rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm text-sm disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Purchase Pins Now'}
              </button>
            </form>

            {purchasedCards.length > 0 && (
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h4 className="font-bold text-blue-900 text-sm mb-2">Purchased Pin Details:</h4>
                <div className="space-y-2">
                  {purchasedCards.map((card: any, idx: number) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-blue-100 text-sm font-mono text-gray-800">
                      <p><strong>Pin/Serial:</strong> {card.pin || card.card_pin || JSON.stringify(card)}</p>
                    </div>
                  ))}
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