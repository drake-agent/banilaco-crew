'use client';

import { useState } from 'react';
import { useApi, useMutation, LoadingSkeleton, ErrorBanner } from '@/hooks/use-api';

interface MissionData {
  id: string;
  missionType: 'learning' | 'creation' | 'viral';
  title: string;
  description: string | null;
  rewardAmount: string | null;
  scoreAmount: number | null;
  completed: boolean;
}

interface MissionsResponse {
  date: string;
  missions: MissionData[];
  completedCount: number;
  totalCount: number;
}

const MISSION_CONFIG = {
  learning: { emoji: '📚', label: 'Learning', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  creation: { emoji: '🎬', label: 'Creation', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  viral: { emoji: '🚀', label: 'Viral', color: 'bg-orange-50 border-orange-200 text-orange-700' },
} as const;

export default function MissionsPage() {
  const { data, loading, error, refetch } = useApi<MissionsResponse>('/api/missions');
  const { trigger: completeMission, loading: completing } = useMutation('/api/missions/complete', 'POST');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [showProofInput, setShowProofInput] = useState<string | null>(null);

  const handleComplete = async (missionId: string) => {
    setCompletingId(missionId);
    try {
      const result = await completeMission({
        missionId,
        proofUrl: proofUrl || undefined,
      });

      if (result?.creator?.tierChanged) {
        // Show tier upgrade celebration
        alert(`🎉 티어 승급! ${result.creator.previousTier} → ${result.creator.newTier}`);
      }

      setProofUrl('');
      setShowProofInput(null);
      refetch();
    } catch (err) {
      console.error('Mission completion failed:', err);
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorBanner message={error} />;

  const missions = data?.missions ?? [];
  const completedCount = data?.completedCount ?? 0;
  const totalCount = data?.totalCount ?? 0;
  const allDone = completedCount >= totalCount && totalCount > 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🌸 Daily Missions</h1>
        <p className="text-gray-600 mt-2">
          Complete missions to earn Flat Fee + Pink Score. Level up your tier!
        </p>
      </div>

      {/* Progress Bar */}
      <div className="card mb-8">
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
          <p className="text-green-600 font-semibold mt-3 text-center">
            🎉 All missions completed today! Great work!
          </p>
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

            return (
              <div
                key={mission.id}
                className={`card border-2 ${
                  mission.completed
                    ? 'border-green-200 bg-green-50 opacity-75'
                    : 'border-gray-200 hover:border-pink-200'
                } transition-all`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{config.emoji}</span>
                      <div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${config.color}`}>
                          {config.label}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 mt-1">
                          {mission.title}
                        </h3>
                      </div>
                    </div>
                    {mission.description && (
                      <p className="text-gray-600 text-sm ml-12 mb-4">{mission.description}</p>
                    )}
                    <div className="flex gap-4 ml-12 text-sm">
                      <span className="font-semibold text-pink-600">💰 +${reward} Flat Fee</span>
                      <span className="font-semibold text-purple-600">⭐ +{score} Score</span>
                    </div>
                  </div>

                  <div className="ml-4 shrink-0">
                    {mission.completed ? (
                      <div className="text-green-600 font-bold text-lg">✅ Done</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {showProofInput === mission.id ? (
                          <>
                            <input
                              type="url"
                              placeholder="Proof URL (optional)"
                              value={proofUrl}
                              onChange={(e) => setProofUrl(e.target.value)}
                              className="text-sm border rounded-lg px-3 py-2 w-48"
                            />
                            <button
                              onClick={() => handleComplete(mission.id)}
                              disabled={isCompleting}
                              className="btn-primary text-sm"
                            >
                              {isCompleting ? 'Submitting...' : 'Submit'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setShowProofInput(mission.id)}
                            className="btn-primary text-sm"
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
