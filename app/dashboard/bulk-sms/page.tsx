'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BulkSmsPage() {
  const [senderId, setSenderId] = useState('');
  const [recipients, setRecipients] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/vtu/bulk-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ senderId, recipients, message }),
      });

      const data = await res.json();
      setStatusMsg(data.message || (res.ok ? 'Sent successfully!' : 'Failed'));
    } catch {
      setStatusMsg('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl border shadow-sm">
        <h3 className="text-lg font-bold mb-4">💬 Bulk SMS Portal</h3>
        {statusMsg && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">{statusMsg}</div>}
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Sender ID (Max 11 Chars)</label>
            <input type="text" maxLength={11} required value={senderId} onChange={(e) => setSenderId(e.target.value)} placeholder="e.g. ProximaHub" className="w-full border p-3 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Phone Numbers (Comma Separated)</label>
            <textarea required value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="08012345678, 08087654321" className="w-full border p-3 rounded-lg h-24" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Message Content</label>
            <textarea required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your SMS message here..." className="w-full border p-3 rounded-lg h-28" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">
            {loading ? 'Sending...' : 'Send Bulk SMS (₦5 / SMS)'}
          </button>
        </form>
      </div>
    </div>
  );
}