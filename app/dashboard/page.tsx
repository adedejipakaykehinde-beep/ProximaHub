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
    }

    fetchUserData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const primaryServices = [
    { href: '/dashboard/data', label: 'Buy Data', desc: 'MTN, Airtel, Glo', icon: '📶', bg: 'bg-blue-50 text-blue-600' },
    { href: '/dashboard/airtime', label: 'Buy Airtime', desc: 'Instant top-up', icon: '📱', bg: 'bg-emerald-50 text-emerald-600' },
    { href: '/dashboard/cable', label: 'Cable TV', desc: 'DSTV, GOTV, Startimes', icon: '📺', bg: 'bg-purple-50 text-purple-600' },
    { href: '/dashboard/electricity', label: 'Electricity', desc: 'Pay electric bills', icon: '⚡', bg: 'bg-amber-50 text-amber-600' },
  ];

  const digitalServices = [
    { href: '/dashboard/exam-pins', label: 'Exam Pins', desc: 'WAEC, NECO & NABTEB', icon: '🎓', bg: 'bg-indigo-50 text-indigo-600' },
    { href: '/dashboard/betting', label: 'Bet Funding', desc: 'SportyBet, 1xBet, etc.', icon: '⚽', bg: 'bg-green-50 text-green-600' },
    { href: '/dashboard/vpn', label: 'VPN Access', desc: 'Express, Nord & Surfshark', icon: '🛡️', bg: 'bg-sky-50 text-sky-600' },
    { href: '/dashboard/proxies', label: 'Buy Proxies', desc: 'Residential & Datacenter', icon: '🌐', bg: 'bg-violet-50 text-violet-600' },
    { href: '/dashboard/otp', label: 'SMS / OTP Rentals', desc: 'WhatsApp, Telegram, etc.', icon: '📲', bg: 'bg-pink-50 text-pink-600' },
    { href: '/dashboard/bulk-sms', label: 'Bulk SMS', desc: 'Custom Sender ID', icon: '💬', bg: 'bg-orange-50 text-orange-600' },
    { href: '/dashboard/airtime-to-cash', label: 'Airtime to Cash', desc: 'Convert surplus airtime', icon: '💸', bg: 'bg-teal-50 text-teal-600' },
    { href: '/dashboard/social-boost', label: 'Social Boost', desc: 'Followers, Likes & Views', icon: '🚀', bg: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-8">
      {/* Top Header Bar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-extrabold text-lg">P</span>
              </div>
              <span className="text-xl font-black text-gray-900 tracking-tight">ProximaHub</span>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/dashboard/profile" className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-blue-600 transition">
                {profile?.full_name ? profile.full_name.split(' ')[0] : 'Profile'}
              </Link>
              <Link href="/admin" className="text-xs bg-gray-900 text-white font-medium px-3 py-1.5 rounded-lg hover:bg-gray-800 transition hidden sm:inline-block">
                Admin
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
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="z-10">
            <p className="text-blue-100 text-xs sm:text-sm font-medium tracking-wide uppercase">Available Wallet Balance</p>
            <h2 className="text-3xl sm:text-4xl font-black mt-1 tracking-tight">
              ₦{loading ? '...' : (profile?.wallet_balance ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-[11px] text-blue-200 mt-1">
              Instant automated funding available
            </p>
          </div>

          <div className="flex gap-3 w-full sm:w-auto z-10">
            <Link
              href="/dashboard/fund-wallet"
              className="flex-1 sm:flex-initial bg-white text-blue-700 px-6 py-3 rounded-2xl font-bold hover:bg-blue-50 transition text-sm shadow-md text-center active:scale-95"
            >
              + Fund Wallet
            </Link>
            <Link
              href="/dashboard/transactions"
              className="flex-1 sm:flex-initial bg-blue-500/20 text-white backdrop-blur-md border border-white/20 px-5 py-3 rounded-2xl font-semibold hover:bg-white/10 transition text-sm text-center active:scale-95"
            >
              History
            </Link>
          </div>
        </div>

        {/* Primary VTU Services Section */}
        <div>
          <h3 className="text-sm font-extrabold text-gray-500 uppercase tracking-wider mb-3 px-1">
            Essential Services
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {primaryServices.map((srv) => (
              <Link 
                key={srv.href} 
                href={srv.href} 
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md active:scale-98 transition flex flex-col items-center text-center group"
              >
                <div className={`w-12 h-12 ${srv.bg} rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition shadow-xs`}>
                  {srv.icon}
                </div>
                <span className="font-bold text-gray-900 text-sm mt-3">{srv.label}</span>
                <span className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{srv.desc}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Extended Digital Services Section */}
        <div>
          <h3 className="text-sm font-extrabold text-gray-500 uppercase tracking-wider mb-3 px-1">
            Digital & Value Added Services
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {digitalServices.map((srv) => (
              <Link 
                key={srv.href} 
                href={srv.href} 
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md active:scale-98 transition flex flex-col items-center text-center group"
              >
                <div className={`w-12 h-12 ${srv.bg} rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition shadow-xs`}>
                  {srv.icon}
                </div>
                <span className="font-bold text-gray-900 text-sm mt-3">{srv.label}</span>
                <span className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{srv.desc}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Transactions Preview */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-gray-900">Recent Activity</h3>
            <Link href="/dashboard/transactions" className="text-xs font-bold text-blue-600 hover:underline">
              View All →
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-xs text-gray-400 py-4 text-center">Loading activity...</p>
            ) : transactions.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No transactions recorded yet.</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center p-3 bg-gray-50/50 hover:bg-gray-50 rounded-2xl transition border border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-sm shadow-xs border border-gray-100">
                      {tx.type === 'funding' ? '💳' : '⚡'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 line-clamp-1">{tx.details}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-extrabold whitespace-nowrap ${tx.type === 'funding' ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {tx.type === 'funding' ? '+' : '-'}₦{tx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Mobile Sticky Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 px-6 py-2 z-50 flex justify-between items-center">
        <Link href="/dashboard" className={`flex flex-col items-center gap-0.5 ${pathname === '/dashboard' ? 'text-blue-600' : 'text-gray-400'}`}>
          <span className="text-lg">🏠</span>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link href="/dashboard/data" className={`flex flex-col items-center gap-0.5 ${pathname === '/dashboard/data' ? 'text-blue-600' : 'text-gray-400'}`}>
          <span className="text-lg">📶</span>
          <span className="text-[10px] font-bold">Data</span>
        </Link>
        <Link href="/dashboard/fund-wallet" className="flex flex-col items-center -mt-5">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl shadow-lg border-2 border-white">
            +
          </div>
          <span className="text-[10px] font-bold text-blue-600 mt-0.5">Fund</span>
        </Link>
        <Link href="/dashboard/transactions" className={`flex flex-col items-center gap-0.5 ${pathname === '/dashboard/transactions' ? 'text-blue-600' : 'text-gray-400'}`}>
          <span className="text-lg">📋</span>
          <span className="text-[10px] font-bold">History</span>
        </Link>
        <Link href="/dashboard/profile" className={`flex flex-col items-center gap-0.5 ${pathname === '/dashboard/profile' ? 'text-blue-600' : 'text-gray-400'}`}>
          <span className="text-lg">👤</span>
          <span className="text-[10px] font-bold">Profile</span>
        </Link>
      </div>
    </div>
  );
}