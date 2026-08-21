'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Profile {
  full_name: string;
  email: string;
  wallet_balance: number;
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // States for funding form
  const [amount, setAmount] = useState<string>('');
  const [fundingLoading, setFundingLoading] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);

  // Function to fetch user details and transactions
  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, email, wallet_balance')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
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

    setLoading(false);
  };

  useEffect(() => {
    async function checkPaymentAndLoad() {
      // 1. Check if Paystack sent the user back with a reference in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const reference = urlParams.get('reference') || urlParams.get('trxref');

      if (reference) {
        setVerifying(true);
        try {
          // Call verification route
          const res = await fetch(`/api/paystack/verify?reference=${reference}`);
          const data = await res.json();

          if (data.success) {
            // Clean up the URL query params so it doesn't verify twice
            window.history.replaceState({}, document.title, '/dashboard/fund-wallet');
          }
        } catch (err) {
          console.error('Verification error:', err);
        } finally {
          setVerifying(false);
        }
      }

      // 2. Fetch fresh user profile & transactions
      await fetchUserData();
    }

    checkPaymentAndLoad();
  }, [router]);

  // Handle Paystack Payment Initialization with Profile Email
  const handleFundWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setFundingLoading(true);

    try {
      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: numAmount,
          email: profile?.email
        }),
      });

      const data = await res.json();

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        alert(data.message || 'Failed to initialize payment.');
      }
    } catch (error) {
      console.error('Paystack initialization error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setFundingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-gray-900">ProximaHub</span>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/dashboard/profile" className="text-sm font-semibold text-gray-600 hover:text-blue-600">
                {profile?.full_name || 'Profile'}
              </Link>
              <Link href="/admin" className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800">
                Admin Panel
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Verification Alert Banner */}
        {verifying && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between">
            <span>Verifying your Paystack transaction and updating balance...</span>
            <span className="animate-spin">⏳</span>
          </div>
        )}

        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <p className="text-blue-100 text-sm font-medium">Available Wallet Balance</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-1">
              ₦{loading ? '...' : (profile?.wallet_balance ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-blue-200 mt-2">
              Instant Wallet Funding with Paystack
            </p>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={() => setShowFundModal(true)} 
              className="flex-1 sm:flex-initial bg-white text-blue-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-50 transition text-sm shadow-sm text-center"
            >
              + Fund Wallet
            </button>
            <Link href="/dashboard/transactions" className="flex-1 sm:flex-initial bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-600 transition text-sm text-center border border-blue-500">
              History
            </Link>
          </div>
        </div>

        {/* Quick VTU Services */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Services</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <Link href="/dashboard/data" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col items-center text-center group">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition">
                📶
              </div>
              <span className="font-semibold text-gray-900 text-sm mt-3">Buy Data</span>
              <span className="text-xs text-gray-400 mt-0.5">MTN, Airtel, Glo, 9mobile</span>
            </Link>

            <Link href="/dashboard/airtime" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col items-center text-center group">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition">
                📱
              </div>
              <span className="font-semibold text-gray-900 text-sm mt-3">Buy Airtime</span>
              <span className="text-xs text-gray-400 mt-0.5">Instant top-up</span>
            </Link>

            <Link href="/dashboard/cable" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col items-center text-center group">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition">
                📺
              </div>
              <span className="font-semibold text-gray-900 text-sm mt-3">Cable TV</span>
              <span className="text-xs text-gray-400 mt-0.5">DSTV, GOTV, Startimes</span>
            </Link>

            <Link href="/dashboard/electricity" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col items-center text-center group">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition">
                ⚡
              </div>
              <span className="font-semibold text-gray-900 text-sm mt-3">Electricity</span>
              <span className="text-xs text-gray-400 mt-0.5">Pay electric bills</span>
            </Link>

          </div>
        </div>

        {/* Recent Transactions Preview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
            <Link href="/dashboard/transactions" className="text-sm font-semibold text-blue-600 hover:underline">
              View All →
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-gray-400">Loading transactions...</p>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-gray-400">No transactions recorded yet.</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-sm">
                      {tx.type === 'funding' ? '💳' : '📶'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{tx.details}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${tx.type === 'funding' ? 'text-green-600' : 'text-gray-900'}`}>
                    {tx.type === 'funding' ? '+' : '-'}₦{tx.amount}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Fund Wallet Modal */}
      {showFundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowFundModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg font-bold"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Fund Wallet</h3>
            <p className="text-xs text-gray-500 mb-4">Enter the amount you would like to add to your wallet balance.</p>

            <form onSubmit={handleFundWallet} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  required
                  min="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                />
              </div>

              <div className="flex gap-2">
                {[500, 1000, 2000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    className="flex-1 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition"
                  >
                    +₦{preset}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={fundingLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50"
              >
                {fundingLoading ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}