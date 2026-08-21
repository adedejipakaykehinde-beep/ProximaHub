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
  token?: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState<string>('User');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchUserData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profile) {
      setFullName(profile.full_name || 'User');
    }

    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (txData) {
      setTransactions(txData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserData();

    // Subscribe to real-time transaction updates
    const channel = supabase
      .channel('transactions-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => {
          setTransactions((prev) => [payload.new as Transaction, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dynamic Filtering Strategy
  const filteredTransactions = transactions.filter((tx) => {
    const detailsLower = tx.details.toLowerCase();
    
    // Category match check
    let matchesCategory = true;
    if (activeCategory === 'funding') matchesCategory = tx.type === 'funding';
    else if (activeCategory === 'airtime') matchesCategory = detailsLower.includes('airtime');
    else if (activeCategory === 'data') matchesCategory = detailsLower.includes('data');
    else if (activeCategory === 'cable') matchesCategory = detailsLower.includes('dstv') || detailsLower.includes('gotv') || detailsLower.includes('startimes') || detailsLower.includes('cable');
    else if (activeCategory === 'electricity') matchesCategory = detailsLower.includes('electricity') || detailsLower.includes('electric');

    // Search query match check
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      detailsLower.includes(q) ||
      tx.id.toLowerCase().includes(q) ||
      (tx.token && tx.token.toLowerCase().includes(q)) ||
      tx.amount.toString().includes(q);

    return matchesCategory && matchesSearch;
  });

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
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
            <p className="text-sm text-gray-500">Search and filter all past wallet activities and purchases</p>
          </div>

          {/* Search Bar Input */}
          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Search ref, token, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'funding', 'airtime', 'data', 'cable', 'electricity'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Transactions Table Container */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-gray-500 text-sm">Loading transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-2">📄</div>
              <p className="text-sm">No transactions found matching criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Description</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition">
                      <td className="py-4 px-6 font-medium text-gray-900">{tx.details}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${
                            tx.type === 'funding'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className={`py-4 px-6 font-bold ${tx.type === 'funding' ? 'text-green-600' : 'text-gray-900'}`}>
                        {tx.type === 'funding' ? '+' : '-'}₦{tx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 capitalize">
                          {tx.status || 'success'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-500">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => {
                            setCopied(false);
                            setSelectedTx(tx);
                          }}
                          className="text-xs text-blue-600 font-semibold hover:underline"
                        >
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Transaction Receipt Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="text-center border-b border-gray-100 pb-4 mb-4">
              <div className="w-12 h-12 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center mx-auto mb-2 text-xl">
                P
              </div>
              <h3 className="text-lg font-bold text-gray-900">ProximaHub Receipt</h3>
              <p className="text-xs text-gray-400">Transaction Details</p>
            </div>

            {selectedTx.token && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4 text-center">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                  Electricity Token
                </p>
                <p className="text-xl font-mono font-extrabold text-amber-950 tracking-wider my-1 select-all">
                  {selectedTx.token}
                </p>
                <button
                  onClick={() => handleCopyToken(selectedTx.token!)}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline transition"
                >
                  {copied ? '✓ Token Copied!' : 'Copy Token'}
                </button>
              </div>
            )}

            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Status</span>
                <span className="font-bold text-green-600 capitalize">{selectedTx.status || 'Success'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Description</span>
                <span className="font-medium text-gray-900 text-right max-w-[200px] truncate">{selectedTx.details}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Amount</span>
                <span className="font-extrabold text-gray-900">
                  ₦{selectedTx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Type</span>
                <span className="font-medium text-gray-900 capitalize">{selectedTx.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Date</span>
                <span className="text-xs text-gray-700">{new Date(selectedTx.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Transaction ID</span>
                <span className="font-mono text-xs text-gray-600">{selectedTx.id}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-gray-900 text-white text-xs font-bold py-3 rounded-xl hover:bg-gray-800 transition"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setSelectedTx(null)}
                className="flex-1 bg-gray-100 text-gray-700 text-xs font-bold py-3 rounded-xl hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}