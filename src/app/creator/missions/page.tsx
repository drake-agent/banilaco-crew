'use client';

import { useState, useEffect } from 'react';
import { useApi, useMutation, LoadingSkeleton, ErrorBanner } from '@/hooks/use-api';
import { StreakWidget } from '@/components/streak-widget';

interface MissionData {
  id: string;
  missionType: 'learning' | 'creation' | 'viral';
  title: string;
  description: string | null;
  rewardAmount: string | null;
  scoreAmount: number | null;
  completed: boolean;
  isMystery: boolean;
}

interface MissionsResponse {
  date: string;
  missions: MissionData[];
  completedCount: number;
  totalCount: number;
}

interface CompletionResult {
  completion: {
    id: string;
    missionTitle: string;
    missionType: string;
    rewardEarned: number;
    scoreEarned: number;
    baseReward: number;
    baseScore: number;
    isMystery: boolean;
    mystery: { multiplier: number; label: string; emoji: string } | null;
  };
  streak: {
    current: number;
    longest: number;
    multiplier: number;
    milestone: { days: number; label: string; emoji: string; multiplier: number } | null;
    broken: boolean;
  };
  creator: {
    missionCount: number;
    flatFeeEarned: number;
    pinkScore: number;
    tier: string;
    tierChanged: boolean;
    previousTier?: string;
    newTier?: string;
  };
}

const MISSION_CONFIG = {
  learning: { emoji: '📚', label: 'Learning', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  creation: { emoji: '🎬', label: 'Creation', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  viral: { emoji: '🚀', label: 'Viral', color: 'bg-orange-50 border-orange-200 text-orange-700' },
} as const;

export default function MissionsPage() {
  const { data, loading, error, refetch } = useApi<MissionsResponse>('missions');
  const { mutate: completeMission } = useMutation<CompletionResult>('missions/complete', 'POST');
  const [completingId, setCompletingId] = useState<string | null>(null);
  // H4 FIX: per-mission proof URL map so opening mission B doesn't inherit
  // mission A's input. The old single `proofUrl` state leaked across cards.
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [showProofInput, setShowProofInput] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<CompletionResult | null>(null);

  // Streak state (refreshed after completion)
  const [streak, setStreak] = useState<CompletionResult['streak'] | null>(null);

  const handleComplete = async (missionId: string) => {
    setCompletingId(missionId);
    const rawProof = proofUrls[missionId]?.trim() ?? '';

    // M2 FIX: validate proof URL format before sending.
    if (rawProof) {
      try {
        const parsed = new URL(rawProof);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          alert('Proof URL must use http(s)');
          setCompletingId(null);
          return;
        }
      } catch {
        alert('Please enter a valid URL');
        setCompletingId(null);
        return;
      }
    }

    try {
      const result = await completeMission({
        missionId,
        proofUrl: rawProof || undefined,
      });

      if (!result) return;

      // Update streak display
      if (result.streak) {
        setStreak(result.streak);
      }

      // Show celebration modal
      setCelebration(result);

      // Clear only this mission's proof URL.
      setProofUrls((prev) => {
        const next = { ...prev };
        delete next[missionId];
        return next;
      });
      setShowProofInput(null);
      refetch();
    } catch (err) {
      console.error('Mission completion failed:', err);
    } finally {
      setCompletingId(null);
    }
  };

  const dismissCelebration = () => setCelebration(null);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorBanner message={error} />;

  const missions = data?.missions ?? [];
  const completedCount = data?.completedCount ?? 0;
  const totalCount = data?.totalCount ?? 0;
  const allDone = completedCount >= totalCount && totalCount > 0;

  return (
    <div className="p-8">
      {/* Celebration Overlay */}
      {celebration && (
        <CelebrationModal result={celebration} onClose={dismissCelebration} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daily Missions</h1>
          <p className="text-gray-600 mt-2">
            Complete missions to earn Flat Fee + Pink Score. Streak multipliers boost your rewards!
          </p>
        </div>
        {/* Compact streak in header */}
        {streak && (
          <StreakWidget
            current={streak.current}
            longest={streak.longest}
            multiplier={streak.multiplier}
            currentMilestone={null}
            nextMilestone={null}
            compact
          />
        )}
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Today&apos;s Progress</h2>
          <span className="text-sm font-bold text-pink-600">
            {completedCount}/{totalCount} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className="bg-linear-to-r from-pink-500 to-rose-500 h-full rounded-full transition-all duration-500"
            style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
        {allDone && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-700 font-bold text-lg">
              All missions completed today! Great work!
            </p>
            <p className="text-green-600 text-sm mt-1">
              Come back tomorrow to keep your streak alive!
            </p>
          </div>
        )}

        {/* Streak multiplier hint */}
        {streak && streak.multiplier > 1 && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold">
              🔥 {streak.multiplier}x Streak Bonus Active
            </span>
            <span className="text-gray-500">
              All rewards are multiplied by your streak!
            </span>
          </div>
        )}
      </div>

      {/* Mission Cards */}
      {missions.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-6xl mb-4">📭</p>
          <p className="text-lg">No missions scheduled for today.</p>
          <p className="text-sm mt-2">Check back tomorrow for new missions!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {missions.map((mission) => {
            const config = MISSION_CONFIG[mission.missionType];
            const reward = parseFloat(mission.rewardAmount ?? '0');
            const score = mission.scoreAmount ?? 0;
            const isCompleting = completingId === mission.id;
            const multiplier = streak?.multiplier ?? 1;

            return (
              <div
                key={mission.id}
                className={`bg-white rounded-xl border-2 shadow-sm p-6 ${
                  mission.completed
                    ? 'border-green-200 bg-green-50 opacity-75'
                    : mission.isMystery
                      ? 'border-purple-300 bg-linear-to-r from-purple-50 to-indigo-50 hover:border-purple-400'
                      : 'border-gray-200 hover:border-pink-200'
                } transition-all`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{mission.isMystery ? '🎰' : config.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${config.color}`}>
                            {config.label}
                          </span>
                          {mission.isMystery && (
                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-purple-100 border border-purple-300 text-purple-700 animate-pulse">
                              MYSTERY 1x~5x
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mt-1">
                          {mission.isMystery && !mission.completed ? '??? Mystery Mission' : mission.title}
                        </h3>
                      </div>
                    </div>
                    {!mission.isMystery && mission.description && (
                      <p className="text-gray-600 text-sm ml-12 mb-4">{mission.description}</p>
                    )}
                    {mission.isMystery && !mission.completed && (
                      <p className="text-purple-600 text-sm ml-12 mb-4">
                        Complete to reveal your reward multiplier!
                      </p>
                    )}
                    {/* M3 FIX: cleanly split mystery vs normal reward rendering — the old
                        conditional produced "?x $$5.00" style output. */}
                    <div className="flex gap-4 ml-12 text-sm">
                      {mission.isMystery && !mission.completed ? (
                        <>
                          <span className="font-semibold text-pink-600">
                            💰 ?× ${reward.toFixed(2)} Flat Fee
                          </span>
                          <span className="font-semibold text-purple-600">
                            ⭐ ?× {score} Score
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-pink-600">
                            💰 +${reward.toFixed(2)} Flat Fee
                            {multiplier > 1 && (
                              <span className="text-orange-500 ml-1">
                                (${(reward * multiplier).toFixed(2)} with streak)
                              </span>
                            )}
                          </span>
                          <span className="font-semibold text-purple-600">
                            ⭐ +{score} Score
                            {multiplier > 1 && (
                              <span className="text-orange-500 ml-1">
                                ({Math.round(score * multiplier)} with streak)
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 shrink-0">
                    {mission.completed ? (
                      <div className="text-green-600 font-bold text-lg">✅ Done</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {showProofInput === mission.id ? (
                          <>
                            <label htmlFor={`proof-${mission.id}`} className="sr-only">
                              Proof URL for {mission.title}
                            </label>
                            <input
                              id={`proof-${mission.id}`}
                              type="url"
                              placeholder="Proof URL (optional)"
                              value={proofUrls[mission.id] ?? ''}
                              onChange={(e) =>
                                setProofUrls((prev) => ({ ...prev, [mission.id]: e.target.value }))
                              }
                              aria-label={`Proof URL for mission: ${mission.title}`}
                              className="text-sm border rounded-lg px-3 py-2 w-48"
                            />
                            <button
                              onClick={() => handleComplete(mission.id)}
                              disabled={isCompleting}
                              className="bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-pink-600 disabled:opacity-50 transition-colors"
                            >
                              {isCompleting ? 'Submitting...' : 'Submit'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setShowProofInput(mission.id)}
                            aria-label={`Complete mission: ${mission.title}`}
                            className="bg-pink-500 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-pink-600 transition-colors"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Celebration Modal
// ---------------------------------------------------------------------------

function CelebrationModal({
  result,
  onClose,
}: {
  result: CompletionResult;
  onClose: () => void;
}) {
  const { completion, streak, creator } = result;
  const hasMultiplier = streak.multiplier > 1;
  const hasMilestone = !!streak.milestone;
  const hasTierUp = creator.tierChanged;
  const hasMystery = completion.isMystery && completion.mystery;

  // Low-priority a11y fix: Escape closes the modal.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-linear-to-r from-pink-500 via-rose-500 to-purple-500 p-6 text-white text-center">
          <p className="text-5xl mb-2">
            {hasTierUp ? '🎉🏆🎉' : hasMystery ? completion.mystery!.emoji : hasMilestone ? streak.milestone!.emoji : '✅'}
          </p>
          <h2 id="celebration-title" className="text-xl font-bold">
            {hasTierUp
              ? 'Tier Upgrade!'
              : hasMystery
                ? `Mystery Revealed: ${completion.mystery!.label}!`
                : hasMilestone
                  ? `${streak.milestone!.label} Unlocked!`
                  : 'Mission Complete!'}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Mystery reveal */}
          {hasMystery && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 text-center">
              <p className="text-3xl mb-1">{completion.mystery!.emoji}</p>
              <p className="text-lg font-bold text-purple-800">
                {completion.mystery!.multiplier}x {completion.mystery!.label}!
              </p>
              {completion.mystery!.multiplier >= 4 && (
                <p className="text-sm text-purple-600 mt-1 font-semibold">JACKPOT!</p>
              )}
            </div>
          )}

          {/* Mission info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">{completion.missionTitle}</p>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="font-bold text-pink-600">💰 +${completion.rewardEarned.toFixed(2)}</span>
              <span className="font-bold text-purple-600">⭐ +{completion.scoreEarned}</span>
            </div>
            {hasMultiplier && (
              <p className="text-xs text-orange-600 mt-1">
                🔥 {streak.multiplier}x streak bonus applied (base: ${completion.baseReward} / {completion.baseScore} pts)
              </p>
            )}
          </div>

          {/* Streak display */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl">🔥</span>
            <span className="text-2xl font-bold text-gray-900">{streak.current} Day Streak</span>
          </div>

          {/* Milestone celebration */}
          {hasMilestone && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 text-center">
              <p className="text-lg font-bold text-orange-800">
                {streak.milestone!.emoji} {streak.milestone!.label}
              </p>
              <p className="text-sm text-orange-700 mt-1">
                {streak.milestone!.multiplier}x reward multiplier unlocked!
              </p>
            </div>
          )}

          {/* Tier upgrade */}
          {hasTierUp && (
            <div className="bg-linear-to-r from-pink-50 to-purple-50 border-2 border-pink-300 rounded-lg p-4 text-center">
              <p className="text-lg font-bold text-pink-800">
                {creator.previousTier} &rarr; {creator.newTier}
              </p>
              <p className="text-sm text-pink-700 mt-1">
                Higher commission rate + squad bonuses unlocked!
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600 transition-colors"
          >
            Continue
          </button>
          <ShareButton
            text={`I just completed a ${completion.missionType} mission on BANILACO SQUAD! 🔥 ${streak.current} day streak!`}
          />
        </div>
      </div>
    </div>
  );
}

function ShareButton({ text }: { text: string }) {
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="px-4 py-3 border-2 border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      title="Share your achievement"
    >
      📤
    </button>
  );
}
