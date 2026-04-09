'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const contentCategories = [
  'Skincare', 'Makeup', 'GRWM', 'ASMR', 'Lifestyle', 'Wellness',
];

const brandExperiences = [
  'Medicube', 'COSRX', 'Beauty of Joseon', 'Anua', 'Torriden', 'Other',
];

const followerRanges = [
  '< 1K', '1K - 5K', '5K - 10K', '10K - 25K', '25K - 50K', '50K - 100K', '100K+',
];

interface FormData {
  tiktokHandle: string;
  displayName: string;
  email: string;
  instagramHandle: string;
  followerCount: string;
  contentCategories: string[];
  whyJoin: string;
  brandExperience: string[];
  squadCode: string;
}

export default function JoinPage() {
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState<FormData>({
    tiktokHandle: '',
    displayName: '',
    email: '',
    instagramHandle: '',
    followerCount: '',
    contentCategories: [],
    whyJoin: '',
    brandExperience: [],
    squadCode: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [squadLeaderName, setSquadLeaderName] = useState<string | null>(null);

  // Parse squad code from URL (?squad=CODE or ?ref=CODE)
  useEffect(() => {
    const code = searchParams.get('squad') ?? searchParams.get('ref') ?? '';
    if (code) {
      setFormData((prev) => ({ ...prev, squadCode: code.toUpperCase() }));
      // Optionally validate the squad code
      fetch(`/api/squad/validate?code=${encodeURIComponent(code)}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.leaderName) setSquadLeaderName(data.leaderName);
        })
        .catch(() => { /* ignore validation errors */ });
    }
  }, [searchParams]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (
    value: string,
    fieldName: 'contentCategories' | 'brandExperience'
  ) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: prev[fieldName].includes(value)
        ? prev[fieldName].filter((item) => item !== value)
        : [...prev[fieldName], value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!formData.tiktokHandle.trim()) {
      setError('TikTok handle is required');
      setIsLoading(false);
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      setIsLoading(false);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        tiktok_handle: formData.tiktokHandle,
        display_name: formData.displayName || undefined,
        email: formData.email,
        instagram_handle: formData.instagramHandle || undefined,
        follower_count: formData.followerCount || undefined,
        content_categories: formData.contentCategories,
        why_join: formData.whyJoin || undefined,
        brand_experience: formData.brandExperience,
        squad_code: formData.squadCode || undefined,
      };

      const response = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to submit application');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-linear-to-br from-pink-50 via-white to-orange-50">
        <nav className="border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold bg-linear-to-r from-pink-500 via-purple-500 to-rose-500 bg-clip-text text-transparent">
              BANILACO SQUAD
            </Link>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="bg-white rounded-2xl border-2 border-green-200 shadow-lg p-10">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
            <p className="text-lg text-gray-600 mb-2">
              Thank you for applying to join BANILACO SQUAD.
            </p>
            <p className="text-gray-600 mb-8">
              We&apos;ll review your application and get back to you within 48 hours.
            </p>

            {/* Next steps */}
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-6 mb-8 text-left">
              <p className="text-sm font-bold text-pink-900 mb-3">While you wait:</p>
              <div className="space-y-3">
                <NextStepItem icon="1" label="Join our Discord community" link="https://discord.gg/banilacoSquad" />
                <NextStepItem icon="2" label="Follow @banilaco on TikTok for content ideas" />
                <NextStepItem icon="3" label="Start creating K-beauty content to build your portfolio" />
              </div>
            </div>

            <Link
              href="/"
              className="inline-block bg-pink-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-pink-600 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold bg-linear-to-r from-pink-500 via-purple-500 to-rose-500 bg-clip-text text-transparent">
            BANILACO SQUAD
          </Link>
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            &larr; Back
          </Link>
        </div>
      </nav>

      {/* Form Container */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
            Join BANILACO SQUAD
          </h1>
          <p className="text-lg text-gray-600">
            Start earning with daily missions, compete in PINK LEAGUE, and grow your squad!
          </p>
        </div>

        {/* Squad invite banner */}
        {formData.squadCode && (
          <div className="bg-linear-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-5 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👥</span>
              <div>
                <p className="font-bold text-indigo-900">
                  {squadLeaderName
                    ? `${squadLeaderName} invited you to their squad!`
                    : `You were invited with code: ${formData.squadCode}`}
                </p>
                <p className="text-sm text-indigo-700 mt-1">
                  Join the squad to earn together and get mentoring from experienced creators.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4">
              <p className="text-red-700 font-medium">Error: {error}</p>
            </div>
          )}

          {/* Section 1: Social Media */}
          <div className="bg-gray-50 rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Social Media Presence</h2>
            <div className="space-y-6">
              <FormField
                label="TikTok Handle"
                name="tiktokHandle"
                required
                placeholder="@yourusername"
                value={formData.tiktokHandle}
                onChange={handleInputChange}
                hint="Include the @ symbol"
              />
              <FormField
                label="Display Name"
                name="displayName"
                placeholder="How you'd like to be called"
                value={formData.displayName}
                onChange={handleInputChange}
              />
              <FormField
                label="Instagram Handle"
                name="instagramHandle"
                placeholder="@yourusername"
                value={formData.instagramHandle}
                onChange={handleInputChange}
              />
              <div>
                <label htmlFor="followerCount" className="block text-sm font-semibold text-gray-700 mb-2">
                  Total Follower Count (across platforms)
                </label>
                <select
                  id="followerCount"
                  name="followerCount"
                  value={formData.followerCount}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  <option value="">Select a range</option>
                  {followerRanges.map((range) => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Content & Interests */}
          <div className="bg-gray-50 rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Content & Interests</h2>
            <div className="space-y-6">
              <CheckboxGroup
                label="What type of content do you create?"
                options={contentCategories}
                selected={formData.contentCategories}
                onChange={(val) => handleCheckboxChange(val, 'contentCategories')}
              />
              <div>
                <label htmlFor="whyJoin" className="block text-sm font-semibold text-gray-700 mb-2">
                  Why do you want to join BANILACO SQUAD?
                </label>
                <textarea
                  id="whyJoin"
                  name="whyJoin"
                  placeholder="Tell us about your passion for K-beauty..."
                  value={formData.whyJoin}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Experience */}
          <div className="bg-gray-50 rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Brand Experience</h2>
            <CheckboxGroup
              label="Have you worked with any of these K-beauty brands?"
              options={brandExperiences}
              selected={formData.brandExperience}
              onChange={(val) => handleCheckboxChange(val, 'brandExperience')}
            />
          </div>

          {/* Section 4: Contact + Squad Code */}
          <div className="bg-gray-50 rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact & Referral</h2>
            <div className="space-y-6">
              <FormField
                label="Email Address"
                name="email"
                type="email"
                required
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleInputChange}
                hint="We'll use this to notify you about your application"
              />
              <FormField
                label="Squad Code (optional)"
                name="squadCode"
                placeholder="e.g. MIASQUAD"
                value={formData.squadCode}
                onChange={handleInputChange}
                hint="Enter a squad code if someone invited you"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 flex-col sm:flex-row">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-linear-to-r from-pink-500 to-rose-500 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? 'Submitting...' : 'Join BANILACO SQUAD'}
            </button>
            <Link
              href="/"
              className="border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg text-center hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>

          <p className="text-xs text-gray-500 text-center">
            By submitting, you agree to our{' '}
            <a href="#" className="text-pink-500 hover:underline">Terms</a> and{' '}
            <a href="#" className="text-pink-500 hover:underline">Privacy Policy</a>.
          </p>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------

function FormField({
  label, name, type = 'text', required, placeholder, value, onChange, hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
      />
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function CheckboxGroup({
  label, options, selected, onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-3">{label}</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
              selected.includes(opt)
                ? 'border-pink-400 bg-pink-50 text-pink-800'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onChange(opt)}
              className="w-4 h-4 rounded border-gray-300 text-pink-500"
            />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function NextStepItem({
  icon, label, link,
}: {
  icon: string;
  label: string;
  link?: string;
}) {
  const content = (
    <div className="flex items-center gap-3">
      <span className="w-6 h-6 bg-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
        {icon}
      </span>
      <span className="text-sm text-pink-800">{label}</span>
    </div>
  );

  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="block hover:underline">
        {content}
      </a>
    );
  }
  return content;
}
