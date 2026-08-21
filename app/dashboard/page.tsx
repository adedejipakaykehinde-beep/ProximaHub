'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

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
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      // 1. Get logged-in user session
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // 2. Fetch profile from Supabase
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, wallet_balance')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // 3. Fetch recent transactions from Supabase
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
    }

    fetchUserData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/dashboard/data', label: 'Data', icon: '📶' },
    { href: '/dashboard/airtime', label: 'Airtime', icon: '📱' },
    { href: '/dashboard/cable', label: 'Cable TV', icon: '📺' },
    { href: '/dashboard/electricity', label: 'Electricity', icon: '⚡' },
    { href: '/dashboard/transactions', label: 'History', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-gray-900">ProximaHub</span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    pathname === link.href
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link href="/dashboard/profile" className="text-sm font-semibold text-gray-600 hover:text-blue-600">
                {profile?.full_name || 'Profile'}
              </Link>
              <Link href="/admin" className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition">
                Admin Panel
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Navigation Row for Mobile / Tablet */}
        <div className="md:hidden border-t border-gray-100 bg-gray-50/50 px-4 py-2 overflow-x-auto flex gap-2 scrollbar-none">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
                pathname === link.href
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
            <Link
              href="/dashboard/fund-wallet"
              className="flex-1 sm:flex-initial bg-white text-blue-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-50 transition text-sm shadow-sm text-center"
            >
              + Fund Wallet
            </Link>
            <Link
              href="/dashboard/transactions"
              className="flex-1 sm:flex-initial bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-600 transition text-sm text-center border border-blue-500"
            >
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
                    {tx.type === 'funding' ? '+' : '-'}₦{tx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}