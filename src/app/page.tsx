import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold gradient-text">
              BANILACO SQUAD
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="btn-outline text-sm">
              Sign In
            </Link>
            <Link href="/join" className="btn-primary text-sm sm:text-base">
              Join Squad
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32 lg:py-40">
        <div className="absolute inset-0 bg-linear-to-br from-pink-50 via-white to-orange-50 -z-10" />

        <div className="section-container text-center">
          <div className="animate-fade-in-up">
            <p className="text-pink-600 font-semibold text-sm sm:text-base mb-4 tracking-widest uppercase">
              K-Beauty Creator Program
            </p>

            <h1 className="section-title">
              Join the{' '}
              <span className="gradient-text">BANILACO SQUAD</span>
            </h1>

            <p className="section-subtitle mx-auto text-lg sm:text-xl text-gray-600 mb-4">
              Earn daily with missions. Compete in PINK LEAGUE. Grow your Squad.
            </p>

            <p className="text-base sm:text-lg text-gray-500 max-w-3xl mx-auto mb-10">
              Complete daily missions to earn{' '}
              <span className="font-bold text-pink-600">Flat Fee + 10-18% commission</span>,
              climb the <span className="font-bold text-orange-600">PINK LEAGUE</span> rankings,
              and build your <span className="font-bold text-purple-600">Squad</span> for ongoing revenue share
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/join" className="btn-primary inline-block">
                Start Your Application
              </Link>
              <a href="#how-it-works" className="btn-outline inline-block">
                Learn More
              </a>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mt-16 pt-16 border-t border-gray-200">
            <p className="text-gray-600 text-sm sm:text-base mb-8">
              Join the K-beauty creator movement with banila co
            </p>
            <div className="grid grid-cols-4 gap-6 max-w-lg mx-auto">
              <div>
                <p className="text-3xl sm:text-4xl font-bold gradient-text">5K+</p>
                <p className="text-gray-600 text-sm mt-2">Creators</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-bold gradient-text">$2M+</p>
                <p className="text-gray-600 text-sm mt-2">Paid Out</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-bold gradient-text">18%</p>
                <p className="text-gray-600 text-sm mt-2">Max Commission</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-bold gradient-text">5%</p>
                <p className="text-gray-600 text-sm mt-2">Squad Bonus</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Pillar Value Prop */}
      <section className="section-container bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <h2 className="section-title text-center">How BANILACO SQUAD Works</h2>
        <p className="section-subtitle text-center mb-12">Three ways to earn, one community to grow</p>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Daily Missions</h3>
            <p className="text-gray-600 mb-4">
              Complete Learning, Creation, and Viral missions every day.
              Earn Flat Fee regardless of sales — your effort always pays.
            </p>
            <div className="text-sm text-pink-600 font-semibold">Flat Fee + Pink Score</div>
          </div>

          <div className="card text-center border-2 border-pink-200">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">PINK LEAGUE</h3>
            <p className="text-gray-600 mb-4">
              Compete in 4-week seasons. Top 10 earn Pink Crown status
              with BANILA CO Summit invites and collab product launches.
            </p>
            <div className="text-sm text-pink-600 font-semibold">Pink Score = GMV + Viral Index</div>
          </div>

          <div className="card text-center">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Build Your Squad</h3>
            <p className="text-gray-600 mb-4">
              Recruit creators and earn 2-5% of your team&apos;s sales.
              Ongoing revenue share — not just a one-time bonus.
            </p>
            <div className="text-sm text-pink-600 font-semibold">Ongoing 2-5% Revenue Share</div>
          </div>
        </div>
      </section>

      {/* Pink Tier System */}
      <section className="section-container">
        <h2 className="section-title text-center">Pink Tier System</h2>
        <p className="section-subtitle text-center mb-12">
          Complete missions or hit sales milestones to level up
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pink Petal */}
          <div className="card border-2 border-pink-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">🌸 Pink Petal</h3>
            <p className="text-sm text-gray-600 mb-4">Join + First Mission</p>
            <div className="text-3xl font-bold gradient-text mb-2">10%</div>
            <p className="text-xs text-gray-500 mb-4">+ Flat Fee per mission</p>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-pink-500 mr-2">✓</span>
                <span>Daily mission access</span>
              </li>
              <li className="flex items-start">
                <span className="text-pink-500 mr-2">✓</span>
                <span>Brand education tools</span>
              </li>
              <li className="flex items-start">
                <span className="text-pink-500 mr-2">✓</span>
                <span>Discord community</span>
              </li>
            </ul>
          </div>

          {/* Pink Rose */}
          <div className="card border-2 border-rose-300 relative">
            <div className="absolute -top-3 -right-3 bg-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold">
              Popular
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">🌹 Pink Rose</h3>
            <p className="text-sm text-gray-600 mb-4">50 missions or $500 GMV</p>
            <div className="text-3xl font-bold gradient-text mb-2">12%</div>
            <p className="text-xs text-gray-500 mb-4">+ Flat Fee + 2% Squad bonus</p>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-pink-500 mr-2">✓</span>
                <span>New product early access</span>
              </li>
              <li className="flex items-start">
                <span className="text-pink-500 mr-2">✓</span>
                <span>Welcome gift package</span>
              </li>
              <li className="flex items-start">
                <span className="text-pink-500 mr-2">✓</span>
                <span>Squad recruitment</span>
              </li>
            </ul>
          </div>

          {/* Pink Diamond */}
          <div className="card border-2 border-cyan-300">
            <h3 className="text-lg font-bold text-gray-900 mb-2">💎 Pink Diamond</h3>
            <p className="text-sm text-gray-600 mb-4">200 missions or $2,500 GMV</p>
            <div className="text-3xl font-bold gradient-text mb-2">15%</div>
            <p className="text-xs text-gray-500 mb-4">+ Premium Fee + 3% Squad bonus</p>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-cyan-500 mr-2">✓</span>
                <span>PINK LEAGUE entry</span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-500 mr-2">✓</span>
                <span>Banilaco social featuring</span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-500 mr-2">✓</span>
                <span>Premium sample sets</span>
              </li>
            </ul>
          </div>

          {/* Pink Crown */}
          <div className="card border-2 border-amber-400 bg-gradient-to-b from-white to-amber-50">
            <h3 className="text-lg font-bold text-gray-900 mb-2">👑 Pink Crown</h3>
            <p className="text-sm text-gray-600 mb-4">League champion or $10K GMV</p>
            <div className="text-3xl font-bold gradient-text mb-2">18%+</div>
            <p className="text-xs text-gray-500 mb-4">+ Annual Fee + 5% Squad bonus</p>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-amber-500 mr-2">✓</span>
                <span>BANILA CO SUMMIT 2026 VIP</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-500 mr-2">✓</span>
                <span>IP Festival invitation</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-500 mr-2">✓</span>
                <span>Collab product launch</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="section-container bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <h2 className="section-title text-center">Get Started in 3 Steps</h2>

        <div className="grid md:grid-cols-3 gap-8 mt-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold gradient-text">1</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Join via Discord</h3>
            <p className="text-gray-600">
              Sign in with Discord, link your TikTok, and complete your first mission to unlock Pink Petal tier.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold gradient-text">2</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Complete Missions</h3>
            <p className="text-gray-600">
              Daily Learning, Creation, and Viral missions. Earn Flat Fee + Score instantly.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold gradient-text">3</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Level Up & Earn</h3>
            <p className="text-gray-600">
              Climb tiers, compete in PINK LEAGUE, and build your Squad for ongoing revenue share.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-linear-to-r from-pink-100 to-orange-100 -z-10" />

        <div className="section-container text-center">
          <h2 className="section-title">Ready to Join the Squad?</h2>
          <p className="section-subtitle mx-auto mb-8">
            Start earning today with BANILACO SQUAD
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/join" className="btn-primary inline-block">
              Join BANILACO SQUAD
            </Link>
            <a href="https://discord.gg/your-invite" className="btn-outline inline-block" target="_blank" rel="noopener noreferrer">
              Join Discord
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="section-container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold mb-4">BANILACO SQUAD</h3>
              <p className="text-sm">
                K-beauty creator program powered by daily missions, PINK LEAGUE, and Squad rewards.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Program</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-pink-500 transition">About</a></li>
                <li><a href="#" className="hover:text-pink-500 transition">FAQ</a></li>
                <li><a href="#" className="hover:text-pink-500 transition">Terms</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://discord.gg/your-invite" className="hover:text-pink-500 transition">Discord</a></li>
                <li><a href="#" className="hover:text-pink-500 transition">TikTok</a></li>
                <li><a href="#" className="hover:text-pink-500 transition">Instagram</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:squad@banila.co" className="hover:text-pink-500 transition">squad@banila.co</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
              <p>&copy; 2026 Banila Co. All rights reserved.</p>
              <div className="flex gap-6 mt-4 sm:mt-0">
                <a href="#" className="hover:text-pink-500 transition">Privacy</a>
                <a href="#" className="hover:text-pink-500 transition">Terms</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
