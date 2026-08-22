'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-24 md:pb-12 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-lg">
                P
              </div>
              <span className="text-xl font-bold text-white tracking-tight">ProximaHub</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your all-in-one digital marketplace for VTU airtime, cheap data bundles, exam pins, bet funding, VPNs, proxies, OTP rentals, and social growth.
            </p>
          </div>

          {/* Quick VTU Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Essential Services</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/dashboard/data" className="hover:text-blue-400 transition">Buy Data</Link></li>
              <li><Link href="/dashboard/airtime" className="hover:text-blue-400 transition">Buy Airtime</Link></li>
              <li><Link href="/dashboard/cable" className="hover:text-blue-400 transition">Cable TV Subscription</Link></li>
              <li><Link href="/dashboard/electricity" className="hover:text-blue-400 transition">Electricity Bills</Link></li>
              <li><Link href="/dashboard/exam-pins" className="hover:text-blue-400 transition">WAEC / NECO Pins</Link></li>
            </ul>
          </div>

          {/* Digital Services Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Digital Services</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/dashboard/betting" className="hover:text-blue-400 transition">Bet Wallet Funding</Link></li>
              <li><Link href="/dashboard/vpn" className="hover:text-blue-400 transition">VPN Premium</Link></li>
              <li><Link href="/dashboard/proxies" className="hover:text-blue-400 transition">Buy Proxies</Link></li>
              <li><Link href="/dashboard/otp" className="hover:text-blue-400 transition">SMS & OTP Rentals</Link></li>
              <li><Link href="/dashboard/social-boost" className="hover:text-blue-400 transition">Social Media Boost</Link></li>
            </ul>
          </div>

          {/* Account & Support */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Account & Support</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/dashboard/fund-wallet" className="hover:text-blue-400 transition">Fund Wallet</Link></li>
              <li><Link href="/dashboard/transactions" className="hover:text-blue-400 transition">Transaction History</Link></li>
              <li><Link href="/dashboard/airtime-to-cash" className="hover:text-blue-400 transition">Airtime to Cash</Link></li>
              <li><Link href="/dashboard/profile" className="hover:text-blue-400 transition">Profile Settings</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ProximaHub. All rights reserved.</p>
          <div className="flex gap-4">
            <span>Fast Delivery</span>
            <span>•</span>
            <span>Encrypted Payments</span>
            <span>•</span>
            <span>24/7 Support</span>
          </div>
        </div>
      </div>
    </footer>
  );
}