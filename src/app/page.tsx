import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold gradient-text">
              Banilaco Crew
            </div>
          </div>
          <Link href="/join" className="btn-primary text-sm sm:text-base">
            Apply Now
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32 lg:py-40">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-white to-orange-50 -z-10" />

        <div className="section-container text-center">
          <div className="animate-fade-in-up">
            <h1 className="section-title">
              Join the{' '}
              <span className="gradient-text">Banilaco Crew</span>
            </h1>

            <p className="section-subtitle mx-auto text-lg sm:text-xl text-gray-600 mb-4">
              Turn your passion for K-beauty into income
            </p>

            <p className="text-base sm:text-lg text-gray-500 max-w-3xl mx-auto mb-10">
              Earn <span className="font-bold text-pink-600">30-40% commission</span> on every sale,
              receive <span className="font-bold text-orange-600">free product samples</span>,
              and join an exclusive community of 5,000+ creators
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
              Join thousands of creators already earning with banila co
            </p>
            <div className="grid grid-cols-3 gap-8 max-w-md mx-auto">
              <div>
                <p className="text-3xl sm:text-4xl font-bold gradient-text">5K+</p>
                <p className="text-gray-600 text-sm mt-2">Active Creators</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-bold gradient-text">$2M+</p>
                <p className="text-gray-600 text-sm mt-2">Paid Out</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-bold gradient-text">40%</p>
                <p className="text-gray-600 text-sm mt-2">Max Commission</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-container bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <h2 className="section-title text-center">Why Join Banilaco Crew?</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {/* Benefit 1 */}
          <div className="card">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Lucrative Commissions</h3>
            <p className="text-gray-600">
              Earn up to 40% commission on every sale. Higher tiers unlock better rates and exclusive perks.
            </p>
          </div>

          {/* Benefit 2 */}
          <div className="card">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Free Samples</h3>
            <p className="text-gray-600">
              Get complimentary access to our full product range. Create authentic content with products you love.
            </p>
          </div>

          {/* Benefit 3 */}
          <div className="card">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Exclusive Community</h3>
            <p className="text-gray-600">
              Connect with fellow creators, share strategies, and grow together in our private community.
            </p>
          </div>

          {/* Benefit 4 */}
          <div className="card">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Real-Time Analytics</h3>
            <p className="text-gray-600">
              Track clicks, conversions, and earnings in real-time with our comprehensive dashboard.
            </p>
          </div>

          {/* Benefit 5 */}
          <div className="card">
            <div className="text-4xl mb-4">🎁</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Monthly Bonuses</h3>
            <p className="text-gray-600">
              Earn extra rewards for hitting performance milestones and exclusive seasonal promotions.
            </p>
          </div>

          {/* Benefit 6 */}
          <div className="card">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Growth Support</h3>
            <p className="text-gray-600">
              Get content ideas, strategy tips, and marketing support to help you succeed.
            </p>
          </div>
        </div>
      </section>

      {/* Commission Tiers Section */}
      <section className="section-container">
        <h2 className="section-title text-center">Commission Tiers</h2>
        <p className="section-subtitle text-center mb-12">
          Unlock higher commissions as you grow
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Bronze Tier */}
          <div className="card border-2 border-gray-300">
            <h3 className="text-lg font-bold text-gray-900 mb-2">🥉 Bronze</h3>
            <p className="text-sm text-gray-600 mb-4">Get started</p>
            <div className="text-3xl font-bold gradient-text mb-6">30%</div>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-pink-500 mr-2">✓</span>
                <span>Basic sample access</span>
              </li>
              <li className="flex items-start">
                <span className="text-pink-500 mr-2">✓</span>
                <span>Community access</span>
              </li>
              <li className="flex items-start">
                <span className="text-pink-500 mr-2">✓</span>
                <span>Monthly newsletter</span>
              </li>
            </ul>
          </div>

          {/* Silver Tier */}
          <div className="card border-2 border-pink-200 relative">
            <div className="absolute -top-3 -right-3 bg-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold">
              Popular
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">🥈 Silver</h3>
            <p className="text-sm text-gray-600 mb-4">5K+ followers</p>
            <div className="text-3xl font-bold gradient-text mb-6">35%</div>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-pink-500 mr-2">✓</span>
                <span>Full sample sets</span>
              </li>
              <li className="flex items-start">
                <span className="text-pink-500 mr-2">✓</span>
                <span>VIP community access</span>
              </li>
              <li className="flex items-start">
                <span className="text-pink-500 mr-2">✓</span>
                <span>Monthly bonuses</span>
              </li>
              <li className="flex items-start">
                <span className="text-pink-500 mr-2">✓</span>
                <span>Content templates</span>
              </li>
            </ul>
          </div>

          {/* Gold Tier */}
          <div className="card border-2 border-orange-300">
            <h3 className="text-lg font-bold text-gray-900 mb-2">🥇 Gold</h3>
            <p className="text-sm text-gray-600 mb-4">15K+ followers</p>
            <div className="text-3xl font-bold gradient-text mb-6">40%</div>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-orange-500 mr-2">✓</span>
                <span>All products access</span>
              </li>
              <li className="flex items-start">
                <span className="text-orange-500 mr-2">✓</span>
                <span>Exclusive collaborations</span>
              </li>
              <li className="flex items-start">
                <span className="text-orange-500 mr-2">✓</span>
                <span>Performance bonuses</span>
              </li>
              <li className="flex items-start">
                <span className="text-orange-500 mr-2">✓</span>
                <span>Monthly strategy calls</span>
              </li>
            </ul>
          </div>

          {/* Diamond Tier */}
          <div className="card border-2 border-purple-300">
            <h3 className="text-lg font-bold text-gray-900 mb-2">💎 Diamond</h3>
            <p className="text-sm text-gray-600 mb-4">50K+ followers</p>
            <div className="text-3xl font-bold gradient-text mb-6">40%+</div>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-purple-500 mr-2">✓</span>
                <span>Custom commission rates</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-500 mr-2">✓</span>
                <span>Dedicated manager</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-500 mr-2">✓</span>
                <span>Co-creation opportunities</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-500 mr-2">✓</span>
                <span>Priority support</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="section-container bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <h2 className="section-title text-center">How It Works</h2>

        <div className="grid md:grid-cols-3 gap-8 mt-12">
          {/* Step 1 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold gradient-text">1</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Apply</h3>
            <p className="text-gray-600">
              Fill out our quick application form. Tell us about your content style and why you love K-beauty.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold gradient-text">2</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Get Approved</h3>
            <p className="text-gray-600">
              We'll review your application and send you your unique affiliate link and sample products.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold gradient-text">3</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Create & Earn</h3>
            <p className="text-gray-600">
              Share your authentic content, track your earnings, and watch your commissions grow.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-100 to-orange-100 -z-10" />

        <div className="section-container text-center">
          <h2 className="section-title">Ready to Join?</h2>
          <p className="section-subtitle mx-auto mb-8">
            Start your journey as a Banilaco Crew member today
          </p>
          <Link href="/join" className="btn-primary inline-block">
            Apply Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="section-container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <h3 className="text-white font-bold mb-4">Banilaco Crew</h3>
              <p className="text-sm">
                K-beauty affiliate program for creators passionate about skincare and beauty.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Program</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-pink-500 transition">
                    About Program
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-pink-500 transition">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-pink-500 transition">
                    Terms & Conditions
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-pink-500 transition">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-pink-500 transition">
                    Content Ideas
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-pink-500 transition">
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="mailto:crew@banila.co"
                    className="hover:text-pink-500 transition"
                  >
                    crew@banila.co
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-pink-500 transition">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-pink-500 transition">
                    TikTok
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
              <p>&copy; 2024 Banila Co. All rights reserved.</p>
              <div className="flex gap-6 mt-4 sm:mt-0">
                <a href="#" className="hover:text-pink-500 transition">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-pink-500 transition">
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
