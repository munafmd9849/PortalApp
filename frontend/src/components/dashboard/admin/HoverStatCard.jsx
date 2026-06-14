import React, { useState, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

const VALUE_COLORS = {
  green: 'text-emerald-700',
  red: 'text-red-700',
  amber: 'text-amber-700',
  blue: 'text-sky-700',
  gray: 'text-slate-600',
};

const TONE_STYLES = {
  good: { card: 'bg-emerald-50 border-emerald-200', value: 'text-emerald-800' },
  bad: { card: 'bg-red-50 border-red-200', value: 'text-red-800' },
  warn: { card: 'bg-amber-50 border-amber-200', value: 'text-amber-800' },
  neutral: { card: 'bg-sky-50 border-sky-200', value: 'text-slate-800' },
};

const EMBED_BORDERS = ['border-blue-200', 'border-green-200', 'border-purple-200', 'border-red-200'];

/**
 * Stat card with lazy-loaded hover breakdown.
 */
export default function HoverStatCard({
  label,
  value,
  cardKey,
  loadBreakdown,
  variant = 'blue',
  tone = 'neutral',
  popoverAlign = 'start',
  className = '',
  embedded = false,
  accentIndex = 0,
  overviewStyle = false,
}) {
  const [hovered, setHovered] = useState(false);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef({});

  const expandable = Boolean(cardKey && loadBreakdown);
  const toneStyle = TONE_STYLES[tone] || TONE_STYLES.neutral;
  const borderAccent = EMBED_BORDERS[accentIndex % EMBED_BORDERS.length];

  const onEnter = useCallback(async () => {
    if (!expandable) return;
    setHovered(true);
    if (cacheRef.current[cardKey]) {
      setItems(cacheRef.current[cardKey]);
      return;
    }
    setLoading(true);
    try {
      const data = await loadBreakdown(cardKey);
      const list = data?.items || [];
      cacheRef.current[cardKey] = list;
      setItems(list);
    } catch (e) {
      console.error('Breakdown load failed:', cardKey, e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [cardKey, expandable, loadBreakdown]);

  const overviewCard = overviewStyle || !embedded;
  const cardClass = overviewCard
    ? `rounded-md px-3 py-3 min-h-[88px] min-w-[110px] flex-1 flex flex-col justify-center transition-all duration-200 border-2 shadow-sm ${
        toneStyle.card
      } ${hovered && expandable ? 'ring-2 ring-slate-400/50' : ''} ${
        expandable ? 'cursor-pointer' : ''
      }`
    : `bg-white p-4 rounded-xl shadow-sm border-l-4 ${borderAccent} hover:shadow-md transition-all duration-300 min-h-[88px] flex flex-col justify-center ${
        hovered && expandable ? 'ring-2 ring-blue-500/40' : ''
      } ${expandable ? 'cursor-pointer' : ''}`;

  const labelClass = overviewCard ? 'text-xs text-gray-700 font-medium leading-tight' : 'text-sm text-gray-600';
  const valueClass = overviewCard
    ? `text-2xl sm:text-3xl font-bold tabular-nums mt-1 ${toneStyle.value}`
    : 'text-2xl font-bold text-gray-800 mt-2 tabular-nums';

  return (
    <div className={`relative ${className}`} onMouseEnter={onEnter} onMouseLeave={() => setHovered(false)}>
      <div className={cardClass}>
        <p className={labelClass}>{label}</p>
        <p className={valueClass}>{value ?? '—'}</p>
      </div>

      {hovered && expandable && (
        <div
          className={`absolute z-[100] min-w-[240px] max-w-[280px] top-full mt-1
            bg-white rounded-lg border border-gray-200 shadow-lg py-2 px-3
            opacity-0 translate-y-1 animate-[popoverIn_0.2s_ease-out_forwards]
            ${popoverAlign === 'end' ? 'right-0 left-auto' : 'left-0'}`}
          role="tooltip"
        >
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : (
            (items || []).map((item, idx) => (
              <div
                key={item.label}
                className={`flex justify-between gap-4 py-1.5 text-sm ${idx < (items?.length || 0) - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <span className="text-gray-600">{item.label}</span>
                <span className={`font-semibold tabular-nums ${VALUE_COLORS[item.color] || 'text-gray-900'}`}>
                  {item.count}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        @keyframes popoverIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
