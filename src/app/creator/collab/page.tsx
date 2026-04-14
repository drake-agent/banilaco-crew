'use client';

import { useState, useEffect, useCallback } from 'react';

interface Collab {
  id: string;
  partnerHandle: string;
  partnerName: string | null;
  productTag: string;
  status: 'pending' | 'matched' | 'verified' | 'expired';
  scoreBoostPct: number;
  duoStreakCount: number;
  isDynamicDuo: boolean;
  initiatorContentUrl: string | null;
  partnerContentUrl: string | null;
  isInitiator: boolean;
  createdAt: string;
  verifiedAt: string | null;
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Waiting for Partner', color: 'bg-amber-100 text-amber-700' },
  matched: { label: 'Content Submitted', color: 'bg-blue-100 text-blue-700' },
  verified: { label: 'Verified!', color: 'bg-green-100 text-green-700' },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-500' },
};

const PRODUCT_OPTIONS = [
  'Clean It Zero', 'Prime Primer', 'Dear Hydration', 'Clean It Zero Foam',
  'Covericious', 'Eye Love Brow', 'Lip Draw', 'Other',
];

export default function CollabPage() {
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [weeklyUsed, setWeeklyUsed] = useState(0);
  const [weeklyLimit, setWeeklyLimit] = useState(3);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseUrl, setResponseUrl] = useState('');

  // Form state
  const [form, setForm] = useState({ partnerHandle: '', productTag: '', contentUrl: '' });
  const [submitError, setSubmitError] = useState('');

  const fetchCollabs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/collabs');
      const data = await res.json();
      setCollabs(data.collabs ?? []);
      setWeeklyUsed(data.weeklyUsed ?? 0);
      setWeeklyLimit(data.weeklyLimit ?? 3);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCollabs(); }, [fetchCollabs]);

  const handleCreate = async () => {
    setSubmitError('');
    const res = await fetch('/api/collabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerHandle: form.partnerHandle.replace('@', ''),
        productTag: form.productTag.toLowerCase().replace(/\s+/g, '_'),
        contentUrl: form.contentUrl || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSubmitError(data.error ?? 'Failed to create collab');
      return;
    }
    setShowForm(false);
    setForm({ partnerHandle: '', productTag: '', contentUrl: '' });
    fetchCollabs();
  };

  const handleRespond = async (collabId: string) => {
    if (!responseUrl.trim()) return;
    const res = await fetch('/api/collabs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collabId, contentUrl: responseUrl }),
    });
    if (res.ok) {
      setRespondingTo(null);
      setResponseUrl('');
      fetchCollabs();
    }
  };

  const pendingAction = collabs.filter(
    (c) => (c.status === 'pending' && !c.isInitiator) || (c.status === 'matched'),
  );
  const verified = collabs.filter((c) => c.status === 'verified');
  const initiated = collabs.filter((c) => c.status === 'pending' && c.isInitiator);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👫 Collab Duo</h1>
          <p className="text-sm text-gray-500 mt-1">
            Collab with another creator for a Pink Score boost
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={weeklyUsed >= weeklyLimit}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + New Collab
        </button>
      </div>

      {/* Weekly Budget */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-900">Weekly Collab Budget</p>
          <p className="text-xs text-indigo-700 mt-0.5">Resets every Monday</p>
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: weeklyLimit }).map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i < weeklyUsed
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white border-2 border-indigo-200 text-indigo-300'
              }`}
            >
              {i < weeklyUsed ? '✓' : i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Start a Collab</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Partner TikTok Handle</label>
              <input
                type="text"
                value={form.partnerHandle}
                onChange={(e) => setForm({ ...form, partnerHandle: e.target.value })}
                placeholder="@username"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select
                value={form.productTag}
                onChange={(e) => setForm({ ...form, productTag: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select product...</option>
                {PRODUCT_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Content URL <span className="text-gray-400">(optional, add later)</span>
              </label>
              <input
                type="url"
                value={form.contentUrl}
                onChange={(e) => setForm({ ...form, contentUrl: e.target.value })}
                placeholder="https://tiktok.com/@you/video/..."
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.partnerHandle || !form.productTag}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50"
            >
              Send Collab Request
            </button>
          </div>
        </div>
      )}

      {/* Action Required */}
      {pendingAction.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Action Required</h2>
          {pendingAction.map((c) => {
            const needsMyContent = c.status === 'pending'
              ? !c.isInitiator
              : c.isInitiator ? !c.initiatorContentUrl : !c.partnerContentUrl;

            return (
              <div key={c.id} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">@{c.partnerHandle}</span>
                    <span className="text-gray-500 mx-2">x</span>
                    <span className="text-sm text-indigo-600 font-medium">{c.productTag.replace(/_/g, ' ')}</span>
                    {c.isDynamicDuo && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Dynamic Duo x{c.duoStreakCount}</span>}
                  </div>
                  <span className="text-sm font-bold text-indigo-600">+{(c.scoreBoostPct * 100).toFixed(0)}%</span>
                </div>

                {needsMyContent && respondingTo !== c.id && (
                  <button
                    onClick={() => setRespondingTo(c.id)}
                    className="mt-3 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600"
                  >
                    Submit My Content
                  </button>
                )}

                {respondingTo === c.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="url"
                      value={responseUrl}
                      onChange={(e) => setResponseUrl(e.target.value)}
                      placeholder="https://tiktok.com/@you/video/..."
                      className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => handleRespond(c.id)}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600"
                    >
                      Verify
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Waiting */}
      {initiated.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Waiting for Partner</h2>
          {initiated.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900">@{c.partnerHandle}</span>
                <span className="text-gray-500 mx-2">x</span>
                <span className="text-sm text-gray-600">{c.productTag.replace(/_/g, ' ')}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_CFG.pending.color}`}>
                {STATUS_CFG.pending.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Verified History */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Verified Collabs</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : verified.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-lg border border-gray-200">
            No verified collabs yet. Start your first one!
          </div>
        ) : (
          <div className="space-y-2">
            {verified.map((c) => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {c.isDynamicDuo && <span className="text-lg">💪</span>}
                  <div>
                    <span className="font-medium text-gray-900">@{c.partnerHandle}</span>
                    <span className="text-gray-500 mx-2">x</span>
                    <span className="text-sm text-gray-600">{c.productTag.replace(/_/g, ' ')}</span>
                    {c.isDynamicDuo && (
                      <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                        Dynamic Duo x{c.duoStreakCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-green-600">+{(c.scoreBoostPct * 100).toFixed(0)}%</span>
                  <p className="text-xs text-gray-400">
                    {c.verifiedAt ? new Date(c.verifiedAt).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm">How Collab Duo Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-800">1. Pick a Partner</p>
            <p className="text-gray-500 text-xs mt-1">
              Choose another BANILACO SQUAD creator and a product to feature together.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-800">2. Both Post Content</p>
            <p className="text-gray-500 text-xs mt-1">
              Each of you creates a TikTok about the same product. Stitch, Duet, or separate videos all count.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-800">3. Get Boosted</p>
            <p className="text-gray-500 text-xs mt-1">
              Both creators get <strong>+15% Pink Score</strong> boost (+20% during PINK LEAGUE season).
              3x with the same partner = <strong>Dynamic Duo +5%</strong> extra.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
