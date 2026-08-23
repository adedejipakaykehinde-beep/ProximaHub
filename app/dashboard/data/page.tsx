'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Plan {
  id: number | string;
  plan_id?: number | string;
  name?: string;
  plan_name?: string;
  size?: string;
  plan?: string;
  price?: number | string;
  amount?: number | string;
  validity?: string;
  plan_type?: string;
}

export default function BuyDataPage() {
  const [network, setNetwork] = useState<string>('mtn');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingPlans, setFetchingPlans] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Map network string to provider network ID
  const getNetworkId = (net: string): number => {
    const safeNet = String(net || '').toLowerCase().trim();
    switch (safeNet) {
      case 'mtn': return 1;
      case 'glo': return 2;
      case 'airtel': return 3;
      case '9mobile':
      case 'etisalat': return 4;
      default: return 1;
    }
  };

  useEffect(() => {
    loadPlans(network);
  }, [network]);

  const loadPlans = async (selectedNet: string) => {
    setFetchingPlans(true);
    setSelectedPlan(null);
    setMessage(null);
    try {
      const netId = getNetworkId(selectedNet);
      const res = await fetch(`/api/vtu/data/plans?network=${netId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.plans)) {
        setPlans(data.plans);
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
      setPlans([]);
    } finally {
      setFetchingPlans(false);
    }
  };

  const handleNetworkChange = (net: string) => {
    setNetwork(String(net).toLowerCase());
  };

  const handleBuyData = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!phoneNumber || phoneNumber.trim().length < 11) {
      setMessage({ type: 'error', text: 'Please enter a valid 11-digit phone number' });
      return;
    }

    if (!selectedPlan) {
      setMessage({ type: 'error', text: 'Please select a data plan' });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const planId = selectedPlan.id || selectedPlan.plan_id;
      const amount = selectedPlan.price || selectedPlan.amount || 0;

      const res = await fetch('/api/vtu/buy-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          network: String(network),
          phoneNumber: phoneNumber.trim(),
          planId,
          amount,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setMessage({ type: 'success', text: result.message || 'Data purchase successful!' });
        setPhoneNumber('');
        setSelectedPlan(null);
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to purchase data' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'An error occurred during transaction' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 text-white">
      <h1 className="text-2xl font-bold mb-4">Buy Data Bundle</h1>

      {message && (
        <div className={`p-3 rounded mb-4 text-sm ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleBuyData} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Select Network Provider</label>
          <div className="grid grid-cols-4 gap-2">
            {['mtn', 'glo', 'airtel', '9mobile'].map((net) => (
              <button
                key={net}
                type="button"
                onClick={() => handleNetworkChange(net)}
                className={`py-2 px-3 rounded font-semibold text-sm transition ${
                  network === net ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
              >
                {net.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Recipient Phone Number</label>
          <input
            type="tel"
            maxLength={11}
            placeholder="08132509098"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full p-3 rounded bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Select Data Plan</label>
          {fetchingPlans ? (
            <p className="text-gray-400 text-sm">Loading plans...</p>
          ) : plans.length === 0 ? (
            <p className="text-gray-400 text-sm">No plans available for this network.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {plans.map((p, idx) => {
                const planId = p.id || p.plan_id || idx;
                const price = p.price || p.amount || 0;
                const isSelected = selectedPlan?.id === p.id || selectedPlan?.plan_id === p.plan_id;
                return (
                  <button
                    key={planId}
                    type="button"
                    onClick={() => setSelectedPlan(p)}
                    className={`p-3 rounded text-left border transition ${
                      isSelected ? 'bg-blue-900/50 border-blue-500' : 'bg-gray-900 border-gray-800'
                    }`}
                  >
                    <div className="font-bold text-sm">{p.name || p.plan_name || p.size || `${p.plan || ''}`}</div>
                    <div className="text-xs text-gray-400">{p.validity || p.plan_type || 'Data Plan'}</div>
                    <div className="text-blue-400 font-bold mt-1 text-sm">₦{price}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || fetchingPlans}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold transition disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Buy Data Now'}
        </button>
      </form>
    </div>
  );
}