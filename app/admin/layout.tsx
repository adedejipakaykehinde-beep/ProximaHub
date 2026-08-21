'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdminStatus() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        alert('Access denied. Admins only.');
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    }

    checkAdminStatus();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center text-sm">
        Verifying Admin Access...
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <span className="bg-red-600 text-white text-xs font-black px-2 py-1 rounded">ADMIN</span>
              <span className="text-lg font-bold text-white">ProximaHub Control Center</span>
            </div>
            <div className="flex gap-4 text-xs font-semibold">
              <Link href="/admin" className="hover:text-blue-400">Overview</Link>
              <Link href="/admin/users" className="hover:text-blue-400">Users</Link>
              <Link href="/dashboard" className="text-gray-400 hover:text-white">← Main Dashboard</Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}