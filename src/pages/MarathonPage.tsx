import { useMemo, useState } from 'react';
import { Medal } from 'lucide-react';
import { useDataStore } from '@/data/DataStore';

const RANK_STYLES: Record<number, string> = {
  1: 'bg-gold-500/20 text-gold-300 border border-gold-500/40',
  2: 'bg-slate-300/15 text-slate-200 border border-slate-300/30',
  3: 'bg-amber-700/25 text-amber-400 border border-amber-600/30',
};

function rankBadge(rank: number): string {
  return RANK_STYLES[rank] ?? 'bg-navy-700 text-navy-300';
}

function formatParticipantName(name: string): string {
  if (/^[^ ]+ [A-ZÅÄÖ]\.$/.test(name)) return name;
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : name;
}

type MarathonSortKey = '2020' | '2021' | '2022' | '2023' | '2024' | '2025' | '2026' | 'competitions' | 'points' | 'average';

export default function MarathonPage() {
  const { marathonTable } = useDataStore();
  const [sortKey, setSortKey] = useState<MarathonSortKey>('average');
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const historicalYears = ['2020', '2021', '2022', '2023', '2024', '2025'];
  const currentYear = '2026';
  const sortedTable = useMemo(() => [...marathonTable].sort((a, b) => {
    if (sortKey === 'competitions') return b.totalCompetitions - a.totalCompetitions;
    if (sortKey === 'points') return b.points - a.points;
    if (sortKey === 'average') return b.averagePercentage - a.averagePercentage || b.points - a.points;
    return (b.yearScores[sortKey] ?? 0) - (a.yearScores[sortKey] ?? 0);
  }), [marathonTable, sortKey]);
  const yearHighlights = useMemo(() => {
    const highlights: Record<string, number> = {};
    for (const year of historicalYears) {
      marathonTable
        .filter((entry) => (entry.yearScores[year] ?? 0) > 0)
        .sort((a, b) => (b.yearScores[year] ?? 0) - (a.yearScores[year] ?? 0) || a.name.localeCompare(b.name))
        .slice(0, 3)
        .forEach((entry, index) => { highlights[`${year}:${entry.name}`] = index + 1; });
    }
    return highlights;
  }, [marathonTable]);

  return (
    <div className="pt-16 lg:pt-20 min-h-screen">
      <div className="max-w-5xl mx-auto px-1 sm:px-3 lg:px-5 py-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-8 h-8 rounded-lg bg-navy-800 border border-gold-500/20 flex items-center justify-center">
            <Medal className="w-4 h-4 text-gold-400" strokeWidth={1.5} />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-50">
            Maratontabell
          </h1>
        </div>

        <p className="text-navy-300 text-xs sm:text-sm mb-4 px-1">
          Historisk poängställning över alla upplagor plus pågående säsong.
        </p>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-navy-700/50 bg-card-gradient">
          <table className="border-collapse w-max min-w-full table-fixed">
            <colgroup>
              <col className="w-[38px] min-w-[38px]" />
              <col className="w-[105px] min-w-[105px]" />
              {historicalYears.map((y) => (
                <col key={y} className="w-[46px] min-w-[46px]" />
              ))}
              <col className="w-[46px] min-w-[46px]" />
              <col className="w-[68px] min-w-[68px]" />
              <col className="w-[60px] min-w-[60px]" />
              <col className="w-[58px] min-w-[58px]" />
            </colgroup>
            <thead>
              <tr className="bg-navy-800/60 text-left text-[9px] uppercase tracking-wide text-navy-300">
                <th className="sticky left-0 z-20 bg-navy-800 px-1 py-1.5 font-semibold text-center">Plats</th>
                <th className="sticky left-[38px] z-20 bg-navy-800 px-1.5 py-1.5 font-semibold">Tävlande</th>
                {historicalYears.map((y) => (
                  <th key={y} className="px-1 py-1.5 font-semibold text-center">
                    <button onClick={() => setSortKey(y as MarathonSortKey)} className="hover:text-gold-300 transition-colors">{y}</button>
                  </th>
                ))}
                <th className="px-1 py-1.5 font-semibold text-center bg-navy-800/80">
                  <button onClick={() => setSortKey('2026')} className="hover:text-gold-300 transition-colors">{currentYear}</button>
                </th>
                <th className="px-1 py-1.5 font-semibold text-center">
                  <button onClick={() => setSortKey('competitions')} className="hover:text-gold-300 transition-colors">Sammanlagt tävlingar</button>
                </th>
                <th className="px-1 py-1.5 font-semibold text-center">
                  <button onClick={() => setSortKey('points')} className="hover:text-gold-300 transition-colors">Sammanlagd poäng</button>
                </th>
                <th className="px-1 py-1.5 font-semibold text-center">
                  <button onClick={() => setSortKey('average')} className="hover:text-gold-300 transition-colors">Snittpoäng i procent</button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTable.map((entry, index) => {
                const historicalPoints = Object.entries(entry.yearScores).filter(([year]) => year !== '2026').reduce((sum, [, points]) => sum + points, 0);
                const currentPoints = entry.yearScores['2026'] ?? Math.max(0, entry.points - historicalPoints);
                const isSelected = selectedName === entry.name;
                const rowBackground = isSelected ? 'bg-teal-500/20' : index % 2 === 0 ? 'bg-navy-900/30' : 'bg-navy-900/10';
                return (
                  <tr
                    key={entry.name}
                    onClick={() => setSelectedName((current) => current === entry.name ? null : entry.name)}
                    className={`border-t border-navy-700/30 hover:bg-navy-800/30 transition-colors cursor-pointer ${rowBackground}`}
                    aria-selected={isSelected}
                  >
                    <td className={`sticky left-0 z-10 px-1 py-1 text-center ${rowBackground}`}>
                      <span
                        className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold ${rankBadge(entry.rank)}`}
                        title={entry.rank <= 3 ? `${entry.rank}: ${entry.rank === 1 ? 'Guld' : entry.rank === 2 ? 'Silver' : 'Brons'}` : undefined}
                      >
                        {entry.rank}
                      </span>
                    </td>
                    <td className={`sticky left-[38px] z-10 px-1.5 py-1 ${rowBackground}`}>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); setSelectedName((current) => current === entry.name ? null : entry.name); }}
                        className="text-navy-100 font-medium text-[11px] sm:text-xs hover:text-gold-300 transition-colors text-left"
                      >
                        {formatParticipantName(entry.name)}
                      </button>
                    </td>
                    {historicalYears.map((y) => {
                      const highlightRank = yearHighlights[`${y}:${entry.name}`];
                      return (
                        <td key={y} className={`px-1 py-1 text-center text-[11px] tabular-nums ${highlightRank ? rankBadge(highlightRank) : 'text-navy-200'}`}>
                          {(entry.yearScores[y] ?? 0) > 0 ? entry.yearScores[y] : '-'}
                        </td>
                      );
                    })}
                    <td className="px-1 py-1 text-center text-[11px] tabular-nums text-gold-300 font-bold bg-navy-800/30">
                      {currentPoints}
                    </td>
                    <td className="px-1 py-1 text-center text-[11px] tabular-nums text-navy-300">
                      {entry.totalCompetitions}
                    </td>
                    <td className="px-1 py-1 text-center">
                      <span className="font-serif text-xs font-bold text-gold-300 tabular-nums">
                        {entry.points}
                      </span>
                    </td>
                    <td className="px-1 py-1 text-center text-[11px] tabular-nums text-navy-200">
                      {entry.averagePercentage.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-navy-500 text-xs mt-4 px-2">
          Klicka på en rad för att markera deltagaren.
        </p>
      </div>
    </div>
  );
}
