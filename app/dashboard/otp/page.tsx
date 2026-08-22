'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function OtpPage() {
  const router = useRouter();
  const [country, setCountry] = useState('us');
  const [service, setService] = useState('whatsapp');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [fullName, setFullName] = useState<string>('User');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rentedNumber, setRentedNumber] = useState<string>('');

  const prices: Record<string, number> = {
    whatsapp: 1500,
    telegram: 1200,
    openai: 2000,
    google: 1000,
  };

  const totalPrice = prices[service] || 1500;

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return router.push('/login');
      const { data: profile } = await supabase.from('profiles').select('full_name, wallet_balance').eq('id', session.user.id).single();
      if (profile) {
        setFullName(profile.full_name || 'User');
        setWalletBalance(profile.wallet_balance || 0);
      }
    })();
  }, [router]);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setRentedNumber('');

    if (walletBalance < totalPrice) {
      setErrorMsg(`Insufficient balance. Cost is ₦${totalPrice}`);
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/vtu/buy-otp', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ country, service, amount: totalPrice }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRentedNumber(data.phoneNumber);
      } else {
        setErrorMsg(data.message || 'Transaction failed');
      }
    } catch {
      setErrorMsg('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 border shadow-sm max-w-xl mx-auto">
          <h3 className="text-lg font-bold mb-4">📲 SMS & Email OTP Rentals</h3>
          {errorMsg && <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-lg text-sm">{errorMsg}</div>}
          <form onSubmit={handlePurchase} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Select Service</label>
              <select value={service} onChange={(e) => setService(e.target.value)} className="w-full border p-3 rounded-lg">
                <option value="whatsapp">WhatsApp (₦1,500)</option>
                <option value="telegram">Telegram (₦1,200)</option>
                <option value="openai">OpenAI / ChatGPT (₦2,000)</option>
                <option value="google">Google / Gmail (₦1,000)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Country</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full border p-3 rounded-lg">
                <option value="us">United States (+1)</option>
                <option value="uk">United Kingdom (+44)</option>
                <option value="ca">Canada (+1)</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">
              {loading ? 'Processing...' : 'Rent Phone Number'}
            </button>
          </form>
          {rentedNumber && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-900">Your Temporary Number:</p>
              <p className="text-xl font-mono font-bold text-blue-700 mt-1">{rentedNumber}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}