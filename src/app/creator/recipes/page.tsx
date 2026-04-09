'use client';

import { useState } from 'react';
import { useApi, LoadingSkeleton, ErrorBanner } from '@/hooks/use-api';

interface Recipe {
  id: string;
  content: string;
  type: string;
  importance: number;
  tags: string[];
  popularity: number;
}

interface RecipesResponse {
  total: number;
  categories: {
    hooks: number;
    formats: number;
    strategy: number;
    product: number;
  };
  categorized: {
    hooks: Recipe[];
    formats: Recipe[];
    strategy: Recipe[];
    product: Recipe[];
  };
}

const CATEGORIES = [
  { key: 'all', label: 'All', emoji: '📋', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { key: 'hooks', label: 'Hook Formulas', emoji: '🎣', color: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'formats', label: 'Content Formats', emoji: '🎬', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'strategy', label: 'Strategy', emoji: '🧠', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'product', label: 'Product Tips', emoji: '🧴', color: 'bg-green-50 text-green-700 border-green-200' },
] as const;

const IMPORTANCE_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: 'Proven', color: 'bg-green-500 text-white' },
  medium: { label: 'Recommended', color: 'bg-blue-500 text-white' },
  low: { label: 'Tip', color: 'bg-gray-400 text-white' },
};

function getImportanceLevel(importance: number): string {
  if (importance >= 0.7) return 'high';
  if (importance >= 0.4) return 'medium';
  return 'low';
}

export default function RecipesPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const { data, loading, error } = useApi<RecipesResponse>('recipes', { limit: 50 });

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorBanner message={error} />;

  const recipes = data?.categorized ?? { hooks: [], formats: [], strategy: [], product: [] };
  const categories = data?.categories ?? { hooks: 0, formats: 0, strategy: 0, product: 0 };

  // Filter recipes by category
  const getDisplayRecipes = (): Recipe[] => {
    if (activeCategory === 'all') {
      return [
        ...recipes.hooks,
        ...recipes.formats,
        ...recipes.strategy,
        ...recipes.product,
      ].sort((a, b) => b.importance - a.importance);
    }
    return (recipes[activeCategory as keyof typeof recipes] ?? [])
      .sort((a, b) => b.importance - a.importance);
  };

  const displayRecipes = getDisplayRecipes();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Content Recipes</h1>
        <p className="text-gray-600 mt-2">
          Proven strategies and formats from top-performing creators. Use these to boost your GMV!
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-3 mb-8">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          const count = cat.key === 'all'
            ? data?.total ?? 0
            : categories[cat.key as keyof typeof categories] ?? 0;

          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                isActive
                  ? 'bg-pink-500 text-white border-pink-500 shadow-md'
                  : `${cat.color} hover:shadow-sm`
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isActive ? 'bg-white/20' : 'bg-white'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Recipe Grid */}
      {displayRecipes.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">📝</p>
          <p className="text-lg">No recipes in this category yet.</p>
          <p className="text-sm mt-2">
            As the AI learns from top creators, more tips will appear here!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="mt-12 bg-linear-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200 p-6">
        <h3 className="font-bold text-gray-900 mb-3">How Content Recipes Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
          <div className="flex gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="font-semibold">AI-Curated</p>
              <p className="text-gray-500">Extracted from top-performing creators and brand campaigns</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-semibold">Data-Backed</p>
              <p className="text-gray-500">Each recipe includes proven GMV and engagement results</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">🔄</span>
            <div>
              <p className="font-semibold">Always Fresh</p>
              <p className="text-gray-500">Updated nightly by our AI distiller from new insights</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const level = getImportanceLevel(recipe.importance);
  const badge = IMPORTANCE_LABELS[level];
  const tags = recipe.tags ?? [];

  // Determine category emoji
  const categoryEmoji = tags.includes('hook') || tags.includes('hooks')
    ? '🎣'
    : tags.includes('format') || tags.includes('content_type')
      ? '🎬'
      : tags.includes('strategy') || tags.includes('posting')
        ? '🧠'
        : tags.includes('product') || tags.includes('sku')
          ? '🧴'
          : '💡';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{categoryEmoji}</span>
        <div className="flex items-center gap-2">
          {recipe.popularity > 0 && (
            <span className="text-xs text-gray-400">{recipe.popularity} views</span>
          )}
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badge.color}`}>
            {badge.label}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
        {recipe.content}
      </p>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
