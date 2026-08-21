export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-gray-900">ProximaHub</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Home</a>
              <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Services</a>
              <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Pricing</a>
              <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Contact</a>
            </div>
<div className="flex items-center gap-3">
  <a href="/login" className="text-gray-700 font-medium hover:text-blue-600">
    Login
  </a>
  <a href="/register" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition">
    Register
  </a>
</div>
            
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Instant Airtime, Data & Bill Payments
            </h1>
            <p className="text-lg sm:text-xl text-blue-100 mb-10">
              The fastest and most reliable VTU platform in Nigeria. Buy cheap data, airtime, electricity tokens, and cable subscriptions in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-blue-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-50 transition shadow-lg">
                Start Buying Now
              </button>
              <button className="border-2 border-white/40 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition">
                Become a Reseller
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Our Services</h2>
            <p className="text-gray-600 text-lg">Everything you need in one place</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "📱", title: "Airtime", desc: "MTN, Airtel, Glo & 9mobile" },
              { icon: "📶", title: "Data Bundles", desc: "Cheapest SME & Gifting plans" },
              { icon: "⚡", title: "Electricity", desc: "All DISCOs – Instant tokens" },
              { icon: "📺", title: "Cable TV", desc: "DSTV, GOTV & Startimes" },
              { icon: "📝", title: "Exam Pins", desc: "WAEC, NECO & NABTEB" },
              { icon: "💰", title: "Betting", desc: "Fund Bet9ja, SportyBet etc." },
              { icon: "💬", title: "Bulk SMS", desc: "Send bulk messages easily" },
              { icon: "🔄", title: "Airtime to Cash", desc: "Convert airtime to wallet" },
            ].map((service, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition cursor-pointer"
              >
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{service.title}</h3>
                <p className="text-gray-500 text-sm">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Why Choose ProximaHub?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
                ⚡
              </div>
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-gray-600">Transactions complete in seconds. No delays.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
                💰
              </div>
              <h3 className="text-xl font-semibold mb-2">Best Rates</h3>
              <p className="text-gray-600">We offer some of the cheapest data & airtime rates.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
                🔒
              </div>
              <h3 className="text-xl font-semibold mb-2">100% Secure</h3>
              <p className="text-gray-600">Your money and data are always protected.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <span className="text-white font-bold text-lg">ProximaHub</span>
          </div>
          <p className="mb-2">© 2026 ProximaHub. All rights reserved.</p>
          <p className="text-sm">Fast • Reliable • Affordable VTU Services</p>
        </div>
      </footer>
    </div>
  );
}