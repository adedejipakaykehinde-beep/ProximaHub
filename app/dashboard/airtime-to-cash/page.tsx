'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AirtimeToCashPage() {
  const [network, setNetwork] = useState('MTN');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/vtu/airtime-to-cash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ network, phoneNumber, amount }),
      });
      const data = await res.json();
      setMsg(data.message);
    } catch {
      setMsg('Failed to process request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl border shadow-sm">
        <h3 className="text-lg font-bold mb-4">💸 Convert Airtime to Cash</h3>
        {msg && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{msg}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Network</label>
            <select value={network} onChange={(e) => setNetwork(e.target.value)} className="w-full border p-3 rounded-lg">
              <option value="MTN">MTN (80% Cash Value)</option>
              <option value="Airtel">Airtel (80% Cash Value)</option>
              <option value="Glo">Glo (75% Cash Value)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Sender Phone Number</label>
            <input type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="08012345678" className="w-full border p-3 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Airtime Amount (₦)</label>
            <input type="number" required min="1000" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000" className="w-full border p-3 rounded-lg" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">
            {loading ? 'Submitting...' : 'Convert Airtime to Cash'}
          </button>
        </form>
      </div>
    </div>
  );
}