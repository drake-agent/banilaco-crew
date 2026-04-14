'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, Power, Pencil, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Mission {
  id: string;
  missionType: 'learning' | 'creation' | 'viral';
  title: string;
  description: string | null;
  rewardType: string;
  rewardAmount: string | null;
  scoreAmount: number | null;
  requiredTier: string | null;
  recurrence: string;
  isActive: boolean;
  durationMinutes: number | null;
  createdAt: string;
}

interface ScheduleEntry {
  id: string;
  slotOrder: number | null;
  activeDate: string;
  mission: Mission;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const TYPE_CFG = {
  learning: { label: 'Learning', color: 'bg-blue-100 text-blue-700 border-blue-200', emoji: '📚' },
  creation: { label: 'Creation', color: 'bg-purple-100 text-purple-700 border-purple-200', emoji: '🎬' },
  viral:    { label: 'Viral',    color: 'bg-orange-100 text-orange-700 border-orange-200', emoji: '🚀' },
} as const;

const TIER_OPTIONS = [
  { value: '', label: 'All Tiers' },
  { value: 'pink_petal', label: '🌸 Petal' },
  { value: 'pink_rose', label: '🌹 Rose' },
  { value: 'pink_diamond', label: '💎 Diamond' },
  { value: 'pink_crown', label: '👑 Crown' },
];

const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'one_time', label: 'One-time' },
  { value: 'event', label: 'Event' },
];

type MissionType = 'learning' | 'creation' | 'viral';
type Recurrence = 'daily' | 'weekly' | 'one_time' | 'event';

interface FormState {
  missionType: MissionType;
  title: string;
  description: string;
  rewardAmount: string;
  scoreAmount: number;
  requiredTier: string;
  recurrence: Recurrence;
  durationMinutes: number;
}

const EMPTY_FORM: FormState = {
  missionType: 'learning',
  title: '',
  description: '',
  rewardAmount: '5.00',
  scoreAmount: 50,
  requiredTier: '',
  recurrence: 'daily',
  durationMinutes: 0,
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function MissionsPage() {
  const [tab, setTab] = useState<'templates' | 'schedule'>('templates');

  // Template state
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Schedule state
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [addingMission, setAddingMission] = useState(false);

  // ---------- Fetch ----------
  const fetchMissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/missions?admin=true');
      const data = await res.json();
      setMissions(data.missions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSchedule = useCallback(async () => {
    const res = await fetch(`/api/missions/schedule?date=${scheduleDate}`);
    const data = await res.json();
    setSchedule(data.schedule ?? []);
  }, [scheduleDate]);

  useEffect(() => { fetchMissions(); }, [fetchMissions]);
  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  // ---------- Handlers ----------
  const handleSubmit = async () => {
    const method = editId ? 'PATCH' : 'POST';
    const payload = {
      ...(editId ? { id: editId } : {}),
      ...form,
      rewardAmount: parseFloat(form.rewardAmount),
      requiredTier: form.requiredTier || null,
      durationMinutes: form.durationMinutes || null,
    };

    const res = await fetch('/api/missions', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      closeForm();
      fetchMissions();
    }
  };

  const handleToggle = async (m: Mission) => {
    await fetch('/api/missions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, isActive: !m.isActive }),
    });
    fetchMissions();
  };

  const handleAddToSchedule = async (missionId: string) => {
    await fetch('/api/missions/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId, activeDate: scheduleDate, slotOrder: schedule.length }),
    });
    setAddingMission(false);
    fetchSchedule();
  };

  const handleRemoveFromSchedule = async (entryId: string) => {
    await fetch('/api/missions/schedule', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entryId }),
    });
    fetchSchedule();
  };

  const startEdit = (m: Mission) => {
    setEditId(m.id);
    setForm({
      missionType: m.missionType,
      title: m.title,
      description: m.description ?? '',
      rewardAmount: m.rewardAmount ?? '0',
      scoreAmount: m.scoreAmount ?? 0,
      requiredTier: m.requiredTier ?? '',
      recurrence: m.recurrence as Recurrence,
      durationMinutes: m.durationMinutes ?? 0,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const shiftDate = (days: number) => {
    const d = new Date(scheduleDate);
    d.setDate(d.getDate() + days);
    setScheduleDate(d.toISOString().split('T')[0]);
  };

  // ---------- Derived ----------
  const activeCount = missions.filter((m) => m.isActive).length;
  const scheduledIds = new Set(schedule.map((s) => s.mission.id));
  const availableForSchedule = missions.filter((m) => m.isActive && !scheduledIds.has(m.id));

  // ---------- Render ----------
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mission Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeCount} active / {missions.length} total templates
          </p>
        </div>
        {tab === 'templates' && (
          <Button onClick={() => { closeForm(); setShowForm(true); }} className="bg-pink-500 hover:bg-pink-600">
            <Plus className="w-4 h-4 mr-1" /> New Mission
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['templates', 'schedule'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
            )}
          >
            {t === 'templates' ? 'Mission Templates' : 'Daily Schedule'}
          </button>
        ))}
      </div>

      {/* ================================================================ */}
      {/* TAB: Templates                                                   */}
      {/* ================================================================ */}
      {tab === 'templates' && (
        <div className="space-y-4">
          {/* Create / Edit Form */}
          {showForm && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  {editId ? 'Edit Mission' : 'Create Mission'}
                </h3>
                <button onClick={closeForm} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.missionType}
                    onChange={(e) => setForm({ ...form, missionType: e.target.value as MissionType })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {Object.entries(TYPE_CFG).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                </div>

                {/* Recurrence */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
                  <select
                    value={form.recurrence}
                    onChange={(e) => setForm({ ...form, recurrence: e.target.value as Recurrence })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {RECURRENCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., Watch Banilaco ingredient education video"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {/* Flat Fee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flat Fee ($)</label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={form.rewardAmount}
                    onChange={(e) => setForm({ ...form, rewardAmount: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {/* Pink Score */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pink Score</label>
                  <input
                    type="number"
                    min="0"
                    value={form.scoreAmount}
                    onChange={(e) => setForm({ ...form, scoreAmount: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {/* Required Tier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required Tier</label>
                  <select
                    value={form.requiredTier}
                    onChange={(e) => setForm({ ...form, requiredTier: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {TIER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={closeForm}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!form.title.trim()} className="bg-pink-500 hover:bg-pink-600">
                  {editId ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          )}

          {/* Mission Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-400">Loading...</div>
            ) : missions.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No missions yet. Create your first one.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Title</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Flat Fee</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Score</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Tier Gate</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Recurrence</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {missions.map((m) => {
                    const cfg = TYPE_CFG[m.missionType];
                    return (
                      <tr key={m.id} className={cn('border-b last:border-0 hover:bg-gray-50', !m.isActive && 'opacity-50')}>
                        <td className="py-3 px-4">
                          <Badge className={cn('text-xs border', cfg.color)}>
                            {cfg.emoji} {cfg.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900">{m.title}</span>
                          {m.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{m.description}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-green-600">
                          ${parseFloat(m.rewardAmount ?? '0').toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-amber-600">
                          {m.scoreAmount ?? 0}
                        </td>
                        <td className="py-3 px-4 text-center text-xs text-gray-500">
                          {m.requiredTier
                            ? TIER_OPTIONS.find((t) => t.value === m.requiredTier)?.label ?? m.requiredTier
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-center text-xs text-gray-500 capitalize">
                          {m.recurrence.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={m.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                            {m.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(m)}
                              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                            <button
                              onClick={() => handleToggle(m)}
                              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                              title={m.isActive ? 'Deactivate' : 'Activate'}
                            >
                              <Power className={cn('w-3.5 h-3.5', m.isActive ? 'text-green-500' : 'text-gray-400')} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB: Daily Schedule                                              */}
      {/* ================================================================ */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          {/* Date Picker */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm font-medium"
              />
              <button onClick={() => shiftDate(1)} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-500 ml-2">
                {new Date(scheduleDate + 'T12:00:00').toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Scheduled Missions */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">
                Scheduled Missions ({schedule.length})
              </h3>
              <Button
                onClick={() => setAddingMission(true)}
                disabled={availableForSchedule.length === 0}
                size="sm"
                className="bg-pink-500 hover:bg-pink-600"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Mission
              </Button>
            </div>

            {schedule.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No missions scheduled for this date.
              </div>
            ) : (
              <div className="divide-y">
                {schedule.map((entry, i) => {
                  const cfg = TYPE_CFG[entry.mission.missionType];
                  return (
                    <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-gray-300 w-6 text-center">{i + 1}</span>
                        <Badge className={cn('text-xs border', cfg.color)}>
                          {cfg.emoji} {cfg.label}
                        </Badge>
                        <div>
                          <span className="font-medium text-gray-900">{entry.mission.title}</span>
                          <span className="text-xs text-gray-500 ml-3">
                            ${parseFloat(entry.mission.rewardAmount ?? '0').toFixed(2)} + {entry.mission.scoreAmount ?? 0} pts
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFromSchedule(entry.id)}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Mission Picker */}
          {addingMission && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 text-sm">Select Mission to Add</h4>
                <button onClick={() => setAddingMission(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {availableForSchedule.length === 0 ? (
                <p className="text-sm text-gray-400">All active missions are already scheduled for this date.</p>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {availableForSchedule.map((m) => {
                    const cfg = TYPE_CFG[m.missionType];
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleAddToSchedule(m.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-left transition-colors"
                      >
                        <Badge className={cn('text-xs border', cfg.color)}>
                          {cfg.emoji} {cfg.label}
                        </Badge>
                        <span className="text-sm font-medium text-gray-900 flex-1">{m.title}</span>
                        <span className="text-xs text-gray-500">
                          ${parseFloat(m.rewardAmount ?? '0').toFixed(2)} + {m.scoreAmount ?? 0} pts
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Quick tip */}
          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 text-sm text-pink-800">
            <strong>Tip:</strong> Schedule 3 missions per day (1 Learning + 1 Creation + 1 Viral) for the best creator experience.
            Creators can only complete each mission once per day.
          </div>
        </div>
      )}
    </div>
  );
}
