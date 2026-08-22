'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Modern Transparent Navbar */}
      <nav className="absolute top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-sm group-hover:scale-105 transition-transform">
                <span className="text-white font-black text-xl">P</span>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">ProximaHub</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#services" className="text-white/80 hover:text-white text-sm font-semibold transition">Services</Link>
              <Link href="#features" className="text-white/80 hover:text-white text-sm font-semibold transition">Features</Link>
              <Link href="/login" className="text-white font-bold text-sm hover:text-blue-200 transition">
                Sign In
              </Link>
              <Link href="/register" className="bg-white text-blue-600 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-50 transition-all hover:scale-105">
                Create Account
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2 focus:outline-none"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 shadow-xl absolute w-full left-0 top-20">
            <div className="px-4 py-6 space-y-4 flex flex-col">
              <Link href="/login" className="text-center w-full bg-slate-800 text-white px-5 py-3 rounded-xl font-semibold border border-slate-700">
                Sign In
              </Link>
              <Link href="/register" className="text-center w-full bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold shadow-md">
                Create Account
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative bg-slate-900 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/30 via-slate-900 to-slate-900"></div>
        <div className="absolute -left-40 top-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 lg:pt-48 lg:pb-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              The Ultimate Digital Marketplace
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-[1.1] mb-6 tracking-tight">
              One Platform For <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                All Your Digital Needs
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
              Experience instant delivery on cheap data, airtime, bill payments, proxies, VPNs, SMS marketing, and social media boosting.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/register" className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 hover:scale-105 flex items-center justify-center gap-2">
                Get Started Now
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
              <Link href="/login" className="w-full sm:w-auto bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-700 transition-all border border-slate-700 flex items-center justify-center gap-2">
                Access Dashboard
              </Link>
            </div>
          </div>
        </div>
        
        {/* Curved Bottom Divider */}
        <div className="absolute bottom-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-[50px] sm:h-[100px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.08,130.83,123.15,198.8,115.63,243.68,110.66,288.57,98.67,321.39,56.44Z" className="fill-slate-50"></path>
          </svg>
        </div>
      </section>

      {/* Complete Services Grid */}
      <section id="services" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 tracking-tight">Our Premium Services</h2>
            <p className="text-slate-500 font-medium text-lg">12 distinct services managed from a single powerful wallet.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: "📶", title: "Data Bundles", desc: "SME & Gifting plans", color: "text-blue-600", bg: "bg-blue-50" },
              { icon: "📱", title: "Airtime Top-up", desc: "Instant recharge", color: "text-emerald-600", bg: "bg-emerald-50" },
              { icon: "📺", title: "Cable TV", desc: "DSTV, GOTV & More", color: "text-indigo-600", bg: "bg-indigo-50" },
              { icon: "⚡", title: "Electricity", desc: "All DISCO tokens", color: "text-amber-600", bg: "bg-amber-50" },
              { icon: "📝", title: "Exam Pins", desc: "WAEC, NECO, NABTEB", color: "text-purple-600", bg: "bg-purple-50" },
              { icon: "⚽", title: "Bet Funding", desc: "Fund betting wallets", color: "text-rose-600", bg: "bg-rose-50" },
              { icon: "🔐", title: "VPN Services", desc: "Premium privacy", color: "text-cyan-600", bg: "bg-cyan-50" },
              { icon: "🌐", title: "Proxies", desc: "Residential & Datacenter", color: "text-teal-600", bg: "bg-teal-50" },
              { icon: "💬", title: "OTP Rentals", desc: "Virtual verification", color: "text-pink-600", bg: "bg-pink-50" },
              { icon: "📩", title: "Bulk SMS", desc: "Marketing campaigns", color: "text-orange-600", bg: "bg-orange-50" },
              { icon: "💸", title: "Airtime to Cash", desc: "Convert unused airtime", color: "text-green-600", bg: "bg-green-50" },
              { icon: "🚀", title: "Social Boost", desc: "Followers & engagement", color: "text-blue-500", bg: "bg-blue-50" },
            ].map((service, index) => (
              <Link href="/login" key={index} className="group bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 ${service.bg} ${service.color} rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-4 group-hover:scale-110 transition-transform`}>
                  {service.icon}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">{service.title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium line-clamp-2">{service.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
            
            <div className="relative p-8 sm:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-6 leading-tight">Built For Speed, <br/>Secured By Default.</h2>
                <p className="text-slate-400 text-lg mb-8 font-medium">ProximaHub is engineered to process your requests instantly. No waiting, no downtime, just results.</p>
                
                <ul className="space-y-6">
                  {[
                    { title: "Automated API Processing", desc: "Orders are fulfilled instantly via direct vendor APIs." },
                    { title: "Bank-Grade Wallet Security", desc: "Your wallet funds are secured with robust encryption." },
                    { title: "24/7 Availability", desc: "Our automated systems work around the clock." }
                  ].map((feat, i) => (
                    <li key={i} className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div>
                        <h4 className="text-white font-bold mb-1">{feat.title}</h4>
                        <p className="text-slate-400 text-sm">{feat.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="relative hidden sm:block">
                {/* Abstract mock UI representation */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-6 rotate-2 transform hover:rotate-0 transition duration-500">
                  <div className="flex justify-between items-center mb-6">
                    <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
                    <div className="w-24 h-8 bg-blue-600 rounded-lg"></div>
                  </div>
                  <div className="w-3/4 h-6 bg-slate-700 rounded mb-4"></div>
                  <div className="w-1/2 h-4 bg-slate-700 rounded mb-8"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-slate-700/50 rounded-xl"></div>
                    <div className="h-24 bg-slate-700/50 rounded-xl"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}