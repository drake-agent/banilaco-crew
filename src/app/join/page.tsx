'use client';

import { useState } from 'react';
import Link from 'next/link';

const contentCategories = [
  'Skincare',
  'Makeup',
  'GRWM',
  'ASMR',
  'Lifestyle',
  'Wellness',
];

const brandExperiences = [
  'Medicube',
  'COSRX',
  'Beauty of Joseon',
  'Anua',
  'Torriden',
  'Other',
];

const followerRanges = [
  '< 1K',
  '1K - 5K',
  '5K - 10K',
  '10K - 25K',
  '25K - 50K',
  '50K - 100K',
  '100K+',
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
}

export default function JoinPage() {
  const [formData, setFormData] = useState<FormData>({
    tiktokHandle: '',
    displayName: '',
    email: '',
    instagramHandle: '',
    followerCount: '',
    contentCategories: [],
    whyJoin: '',
    brandExperience: [],
  });

  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

    // Validation
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
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit application');
      }

      setSubmitted(true);
      setFormData({
        tiktokHandle: '',
        displayName: '',
        email: '',
        instagramHandle: '',
        followerCount: '',
        contentCategories: [],
        whyJoin: '',
        brandExperience: [],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50 py-20">
        {/* Navigation */}
        <nav className="border-b border-gray-100 shadow-sm mb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold gradient-text">
              Banilaco Crew
            </Link>
          </div>
        </nav>

        <div className="section-container max-w-2xl mx-auto text-center">
          <div className="card border-2 border-green-300 bg-green-50">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Application Submitted!
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Thank you for applying to join the Banilaco Crew.
            </p>
            <p className="text-gray-600 mb-8">
              We'll review your application and get back to you within 48 hours at the email
              you provided.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-left">
              <p className="text-sm text-gray-700">
                <strong>In the meantime:</strong>
              </p>
              <ul className="text-sm text-gray-700 mt-3 space-y-2">
                <li>✓ Follow our social media for content tips and updates</li>
                <li>✓ Check out our blog for K-beauty trends</li>
                <li>✓ Join our community Discord (link sent via email)</li>
              </ul>
            </div>
            <Link href="/" className="btn-primary inline-block">
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
          <Link href="/" className="text-2xl font-bold gradient-text">
            Banilaco Crew
          </Link>
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            ← Back
          </Link>
        </div>
      </nav>

      {/* Form Container */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
            Join Banilaco Crew
          </h1>
          <p className="text-lg text-gray-600">
            Complete this application to become an affiliate creator
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4">
              <p className="text-red-700 font-medium">Error: {error}</p>
            </div>
          )}

          {/* Section 1: Social Media Handles */}
          <div className="bg-gray-50 rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Social Media Presence</h2>

            <div className="space-y-6">
              {/* TikTok Handle */}
              <div>
                <label htmlFor="tiktokHandle" className="form-label">
                  TikTok Handle <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="tiktokHandle"
                  name="tiktokHandle"
                  placeholder="@yourusername"
                  value={formData.tiktokHandle}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">Include the @ symbol</p>
              </div>

              {/* Display Name */}
              <div>
                <label htmlFor="displayName" className="form-label">
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  placeholder="How you'd like to be credited"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              {/* Instagram Handle */}
              <div>
                <label htmlFor="instagramHandle" className="form-label">
                  Instagram Handle
                </label>
                <input
                  type="text"
                  id="instagramHandle"
                  name="instagramHandle"
                  placeholder="@yourusername"
                  value={formData.instagramHandle}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              {/* Follower Count */}
              <div>
                <label htmlFor="followerCount" className="form-label">
                  Total Follower Count (across platforms)
                </label>
                <select
                  id="followerCount"
                  name="followerCount"
                  value={formData.followerCount}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="">Select a range</option>
                  {followerRanges.map((range) => (
                    <option key={range} value={range}>
                      {range}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Content & Interests */}
          <div className="bg-gray-50 rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Content & Interests</h2>

            <div className="space-y-6">
              {/* Content Categories */}
              <div>
                <label className="form-label">What type of content do you create?</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {contentCategories.map((category) => (
                    <label key={category} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.contentCategories.includes(category)}
                        onChange={() => handleCheckboxChange(category, 'contentCategories')}
                        className="w-4 h-4 rounded border-gray-300 text-pink-500 cursor-pointer"
                      />
                      <span className="ml-3 text-gray-700">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Why Join */}
              <div>
                <label htmlFor="whyJoin" className="form-label">
                  Why do you want to join Banilaco Crew?
                </label>
                <textarea
                  id="whyJoin"
                  name="whyJoin"
                  placeholder="Tell us about your passion for K-beauty and why you'd be a great fit..."
                  value={formData.whyJoin}
                  onChange={handleInputChange}
                  rows={5}
                  className="input-field resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {formData.whyJoin.length}/500 characters
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Experience */}
          <div className="bg-gray-50 rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Brand Experience</h2>

            <div>
              <label className="form-label">
                Have you worked with any of these K-beauty brands before?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {brandExperiences.map((brand) => (
                  <label key={brand} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.brandExperience.includes(brand)}
                      onChange={() => handleCheckboxChange(brand, 'brandExperience')}
                      className="w-4 h-4 rounded border-gray-300 text-orange-500 cursor-pointer"
                    />
                    <span className="ml-3 text-gray-700">{brand}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Contact Info */}
          <div className="bg-gray-50 rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>

            <div>
              <label htmlFor="email" className="form-label">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleInputChange}
                className="input-field"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                We'll use this to contact you about your application
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 flex-col sm:flex-row">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Submitting...' : 'Submit Application'}
            </button>
            <Link href="/" className="btn-outline text-center">
              Cancel
            </Link>
          </div>

          {/* Terms Notice */}
          <p className="text-xs text-gray-500 text-center">
            By submitting this form, you agree to our{' '}
            <a href="#" className="text-pink-500 hover:underline">
              Terms & Conditions
            </a>{' '}
            and{' '}
            <a href="#" className="text-pink-500 hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
