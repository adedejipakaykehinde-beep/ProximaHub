'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SocialBoostPage() {
  const [platform, setPlatform] = useState('instagram');
  const [serviceType, setServiceType] = useState('followers');
  const [targetUrl, setTargetUrl] = useState('');
  const [quantity, setQuantity] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const ratePerThousand: Record<string, number> = {
    followers: 1500,
    likes: 500,
    views: 300,
  };

  const totalPrice = (ratePerThousand[serviceType] || 1000) * (quantity / 1000);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/vtu/social-boost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ platform, serviceType, targetUrl, quantity, amount: totalPrice }),
      });
      const data = await res.json();
      setMsg(data.message);
    } catch {
      setMsg('Failed to process order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl border shadow-sm">
        <h3 className="text-lg font-bold mb-4">🚀 Social Media Boosting</h3>
        {msg && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">{msg}</div>}
        <form onSubmit={handleOrder} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full border p-3 rounded-lg">
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="facebook">Facebook</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Service</label>
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="w-full border p-3 rounded-lg">
              <option value="followers">Followers (₦1,500 / 1k)</option>
              <option value="likes">Likes (₦500 / 1k)</option>
              <option value="views">Views (₦300 / 1k)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Target Account Link / Post URL</label>
            <input type="url" required value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://instagram.com/yourusername" className="w-full border p-3 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Quantity</label>
            <input type="number" required step="100" min="100" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full border p-3 rounded-lg" />
          </div>
          <div className="p-3 bg-gray-50 font-bold text-gray-800 rounded-lg flex justify-between">
            <span>Total Cost:</span>
            <span>₦{totalPrice.toLocaleString()}</span>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">
            {loading ? 'Processing...' : 'Place Boosting Order'}
          </button>
        </form>
      </div>
    </div>
  );
}