import React, { useState, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

const VALUE_COLORS = {
  green: 'text-emerald-600',
  red: 'text-red-600',
  amber: 'text-amber-600',
  blue: 'text-blue-600',
  gray: 'text-slate-600',
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
  className = '',
  embedded = false,
  accentIndex = 0,
}) {
  const [hovered, setHovered] = useState(false);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef({});

  const bgMap = {
    blue: 'bg-[#dceaf7]',
    green: 'bg-[#dff3e4]',
    purple: 'bg-[#e8dff5]',
  };

  const expandable = Boolean(cardKey && loadBreakdown);
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

  const cardClass = embedded
    ? `bg-white p-4 rounded-xl shadow-sm border-l-4 ${borderAccent} hover:shadow-md transition-all duration-300 min-h-[88px] flex flex-col justify-center ${
        hovered && expandable ? 'ring-2 ring-blue-500/40' : ''
      } ${expandable ? 'cursor-pointer' : ''}`
    : `rounded-md px-3 py-2.5 min-h-[76px] flex flex-col justify-center transition-all duration-200 ${
        bgMap[variant] || bgMap.blue
      } ${hovered && expandable ? 'border-2 border-[#1e3a5f] shadow-sm' : 'border-2 border-[#9ec5e8] shadow-sm'} ${
        expandable ? 'cursor-pointer' : ''
      }`;

  const labelClass = embedded ? 'text-sm text-gray-600' : 'text-[11px] text-gray-600 font-medium leading-snug';
  const valueClass = embedded
    ? 'text-2xl font-bold text-gray-800 mt-2 tabular-nums'
    : 'text-2xl font-bold text-gray-900 tabular-nums mt-0.5';

  return (
    <div className={`relative ${className}`} onMouseEnter={onEnter} onMouseLeave={() => setHovered(false)}>
      <div className={cardClass}>
        <p className={labelClass}>{label}</p>
        <p className={valueClass}>{value ?? '—'}</p>
      </div>

      {hovered && expandable && (
        <div
          className="absolute left-0 z-[100] min-w-[240px] max-w-[280px] top-full mt-1
            bg-white rounded-lg border border-gray-200 shadow-lg py-2 px-3
            opacity-0 translate-y-1 animate-[popoverIn_0.2s_ease-out_forwards]"
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
