import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus, Settings2, Trophy, Calendar, Users, CheckCircle2, XCircle,
  ArrowLeft, AlertTriangle, Trophy as TrophyIcon, Clock, Trash2, Pencil, Shield,
  Star, Lock, X, Medal,
} from 'lucide-react';
import { useDataStore } from '@/data/DataStore';
import { importedParticipantNames, type CompetitionStatus } from '@/data/importData';
import { StatusBadge } from '@/components/CompetitionCard';
import type { Competition } from '@/data/mockData';
import { formatDate } from '@/data/formatDate';

const participantNames = importedParticipantNames;

type AdminView = 'list' | 'new' | 'edit' | 'newUpdate' | 'editUpdate' | 'marathon';

const ADMIN_AUTH_KEY = 'flard_admin_auth';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function AdminLogin({ onSuccess, onLogout }: { onSuccess: () => void; onLogout?: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Fel lösenord');
      }
      const data = await response.json();
      if (data.authenticated) {
        sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
        onSuccess();
      } else {
        throw new Error('Fel lösenord');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte logga in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-16 lg:pt-20 min-h-screen flex items-center justify-center">
      <div className="max-w-sm w-full mx-auto px-4">
        <div className="bg-card-gradient rounded-2xl border border-navy-700/50 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <Lock className="w-5 h-5 text-teal-400" strokeWidth={1.5} />
            </div>
            <div>
              <span className="text-xs font-bold tracking-[0.2em] text-teal-400 uppercase">Admin</span>
              <h1 className="font-serif text-xl font-bold text-navy-50">Inloggning krävs</h1>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-navy-200 mb-2">Lösenord</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 placeholder:text-navy-500 focus:border-teal-500/50 focus:outline-none transition-colors text-base"
                placeholder="Ange admin-lösenord"
              />
            </div>
            {error && (
              <p className="text-red-300 text-sm font-medium">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-navy-950 font-bold text-base hover:from-teal-400 hover:to-teal-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20"
            >
              {loading ? 'Loggar in...' : 'Logga in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const store = useDataStore();
  const [view, setView] = useState<AdminView>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true');

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    setAuthed(false);
  };

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }

  useEffect(() => {
    if (store.saveError) setActionError(store.saveError);
  }, [store.saveError]);

  if (view === 'new') {
    return <NewCompetitionForm onCancel={() => setView('list')} onSave={async (data) => { try { await store.addCompetition(data); setView('list'); } catch { setActionError('Kunde inte skapa tävlingen'); } }} />;
  }

  if (view === 'edit' && editingId !== null) {
    const comp = store.getCompetitionById(editingId);
    if (!comp) { setView('list'); return null; }
    return <EditCompetition competitionId={editingId} onCancel={() => { setView('list'); setEditingId(null); }} />;
  }

  if (view === 'marathon') {
    return <MarathonEditor onCancel={() => setView('list')} />;
  }

  if (view === 'newUpdate') {
    return <UpdateForm onCancel={() => setView('list')} onSave={async (data) => { try { await store.addUpdate(data); setView('list'); } catch { setActionError('Kunde inte skapa uppdateringen'); } }} />;
  }

  if (view === 'editUpdate' && editingId !== null) {
    const upd = store.updates.find((u) => u.id === editingId);
    if (!upd) { setView('list'); return null; }
    return <UpdateForm update={upd} onCancel={() => { setView('list'); setEditingId(null); }} onSave={async (data) => { try { await store.updateUpdate(editingId, data); setView('list'); setEditingId(null); } catch { setActionError('Kunde inte spara uppdateringen'); } }} />;
  }

  const compToDelete = deleteConfirmId !== null ? store.getCompetitionById(deleteConfirmId) : null;

  return (
    <div className="pt-16 lg:pt-20 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Error banner */}
        {actionError && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-300 font-semibold text-sm">Ett fel uppstod</p>
              <p className="text-red-200/70 text-sm mt-0.5">{actionError}</p>
            </div>
            <button onClick={() => { setActionError(null); store.clearSaveError(); }} className="text-red-300 hover:text-red-200 text-sm font-medium">Stäng</button>
          </div>
        )}

        {/* Admin label */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-teal-400" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <span className="text-xs font-bold tracking-[0.2em] text-teal-400 uppercase">Admin</span>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-50">
                Hantera tävlingar, svar, resultat och uppdateringar
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-800 text-navy-300 font-semibold text-sm border border-navy-700/30 hover:border-red-500/40 hover:text-red-300 transition-colors whitespace-nowrap"
            >
              <Lock className="w-4 h-4" />
              Logga ut
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <button
            onClick={() => setView('new')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-navy-950 font-bold text-base hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20"
          >
            <Plus className="w-5 h-5" />
            Ny tävling
          </button>
          <button
            onClick={() => setView('newUpdate')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-navy-800 text-navy-100 font-bold text-base border border-navy-600/50 hover:border-teal-500/40 hover:text-teal-300 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Ny uppdatering
          </button>
          <button
            onClick={() => setView('marathon')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-navy-800 text-navy-100 font-bold text-base border border-navy-600/50 hover:border-gold-500/40 hover:text-gold-300 transition-colors"
          >
            <Medal className="w-5 h-5" />
            Redigera maratontabell
          </button>
        </div>

        {/* Tävlingar heading */}
        <h2 className="font-serif text-lg font-bold text-navy-100 mb-3">Tävlingar</h2>

        {/* Competition list — sorted chronologically by date */}
        <div className="space-y-3">
          {[...store.competitions].sort((a, b) => a.date.localeCompare(b.date)).map((comp) => {
            const answeredCount = comp.tips.filter((t) => t.tip && t.tip !== '').length;
            return (
              <div
                key={comp.id}
                className="rounded-xl bg-navy-900/40 border border-navy-700/30 p-4 sm:p-5 hover:border-navy-600 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-serif text-base font-bold text-navy-50 truncate">{comp.name}</h3>
                      {comp.isTiebreaker && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-500/15 border border-gold-500/30 text-xs text-gold-300 font-semibold">
                          <Star className="w-3 h-3" /> Utslagsgivare
                        </span>
                      )}
                      <StatusBadge status={comp.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-navy-400 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> {formatDate(comp.date)}
                      </span>
                      {comp.result && (
                        <span className="flex items-center gap-1.5 text-gold-300">
                          <TrophyIcon className="w-3.5 h-3.5" /> {comp.result}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> {answeredCount} svar
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setEditingId(comp.id); setView('edit'); }}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-navy-800 text-navy-100 font-semibold text-sm border border-navy-600/50 hover:border-gold-500/40 hover:text-gold-300 transition-colors whitespace-nowrap"
                    >
                      <Settings2 className="w-4 h-4" />
                      Redigera
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(comp.id)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-navy-800/50 text-navy-300 font-semibold text-sm border border-navy-700/30 hover:border-red-500/40 hover:text-red-300 transition-colors whitespace-nowrap"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="font-serif text-lg font-bold text-navy-100 mb-3 mt-8">Maratontabell</h2>
        <div className="rounded-xl bg-navy-900/40 border border-navy-700/30 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-navy-800/60 text-left text-xs uppercase tracking-wider text-navy-300">
                  <th className="px-4 py-2 font-semibold">Deltagare</th>
                  <th className="px-4 py-2 font-semibold text-right">Legacy</th>
                  <th className="px-4 py-2 font-semibold text-right">FLÄRD</th>
                  <th className="px-4 py-2 font-semibold text-right">Diff</th>
                </tr>
              </thead>
              <tbody>
                {store.standings.map((entry, i) => {
                  const legacy = store.legacyPoints[entry.name] ?? 0;
                  const diff = entry.points - legacy;
                  return (
                    <tr key={entry.name} className={`border-t border-navy-700/30 ${i % 2 === 0 ? 'bg-navy-900/30' : 'bg-navy-900/10'}`}>
                      <td className="px-4 py-2 text-sm text-navy-100 font-medium">{entry.name}</td>
                      <td className="px-4 py-2 text-sm text-navy-300 text-right tabular-nums">{legacy}</td>
                      <td className="px-4 py-2 text-sm text-gold-300 font-bold text-right tabular-nums">{entry.points}</td>
                      <td className={`px-4 py-2 text-sm text-right tabular-nums font-semibold ${diff === 0 ? 'text-navy-400' : diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Uppdateringar heading */}
        <h2 className="font-serif text-lg font-bold text-navy-100 mb-3 mt-8">Uppdateringar</h2>
        <div className="space-y-3">
          {store.updates.map((upd) => (
            <div
              key={upd.id}
              className="rounded-xl bg-navy-900/40 border border-navy-700/30 p-4 sm:p-5 hover:border-navy-600 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="text-xs text-gold-400 font-semibold tracking-widest uppercase">{upd.date}</span>
                  </div>
                  <h3 className="font-serif text-base font-bold text-navy-50 truncate">{upd.title}</h3>
                  <p className="text-sm text-navy-300 font-semibold mt-0.5">{upd.subtitle}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setEditingId(upd.id); setView('editUpdate'); }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-navy-800 text-navy-100 font-semibold text-sm border border-navy-600/50 hover:border-teal-500/40 hover:text-teal-300 transition-colors whitespace-nowrap"
                  >
                    <Pencil className="w-4 h-4" />
                    Redigera
                  </button>
                  <button
                    onClick={() => { store.deleteUpdate(upd.id).catch(() => setActionError('Kunde inte ta bort uppdateringen')); }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-navy-800/50 text-navy-300 font-semibold text-sm border border-navy-700/30 hover:border-red-500/40 hover:text-red-300 transition-colors whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete competition confirmation */}
      {compToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="max-w-sm w-full rounded-2xl bg-navy-900 border border-red-500/30 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-serif text-lg font-bold text-navy-50">Ta bort tävling?</h3>
            </div>
            <p className="text-navy-300 text-sm mb-6">
              <span className="font-semibold text-navy-100">{compToDelete.name}</span> tas bort permanent med alla svar och poäng. Detta kan inte ångras.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-5 py-3 rounded-lg bg-navy-800 text-navy-200 font-semibold text-sm border border-navy-600/50 hover:border-navy-500 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={() => { store.deleteCompetition(compToDelete.id).catch(() => setActionError('Kunde inte ta bort tävlingen')); setDeleteConfirmId(null); }}
                className="flex-1 px-5 py-3 rounded-lg bg-red-500/80 text-white font-bold text-sm hover:bg-red-500 transition-colors"
              >
                Ta bort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Marathon Editor ---
function MarathonEditor({ onCancel }: { onCancel: () => void }) {
  const store = useDataStore();
  const [newParticipant, setNewParticipant] = useState('');
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null);
  const [editedParticipantName, setEditedParticipantName] = useState('');
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];

  const handleScoreChange = (name: string, year: string, value: string) => {
    const score = parseInt(value, 10);
    const finalScore = isNaN(score) ? 0 : score;
    store.setMarathonYearScore(name, year, finalScore).catch(() => {});
  };

  const handleAddParticipant = () => {
    const name = newParticipant.trim();
    if (!name) return;
    store.addMarathonParticipant(name).then(() => setNewParticipant('')).catch(() => {});
  };

  const handleRenameParticipant = (oldName: string) => {
    const name = editedParticipantName.trim();
    if (!name) return;
    store.updateMarathonParticipantName(oldName, name).then(() => {
      setEditingParticipant(null);
      setEditedParticipantName('');
    }).catch(() => {});
  };

  return (
    <div ref={topRef} className="pt-16 lg:pt-20 min-h-screen">
      <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-6 py-12">
        <button onClick={onCancel} className="inline-flex items-center gap-2 text-navy-300 hover:text-gold-300 text-sm font-medium mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Tillbaka till Admin
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-navy-800 border border-gold-500/20 flex items-center justify-center">
            <Medal className="w-5 h-5 text-gold-400" strokeWidth={1.5} />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-50">
            Redigera maratontabell
          </h1>
        </div>
        <p className="text-navy-300 text-sm mb-4">
          Ange poäng för säsongerna 2020–2026. Säsong 2026 kan uppdateras löpande.
        </p>

        {/* Add participant */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={newParticipant}
            onChange={(e) => setNewParticipant(e.target.value)}
            placeholder="Ny deltagare"
            className="w-48 px-3 py-2 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none transition-colors text-sm"
          />
          <button
            onClick={handleAddParticipant}
            disabled={!newParticipant.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold-500/20 text-gold-300 font-semibold text-sm border border-gold-500/40 hover:bg-gold-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Lägg till deltagare
          </button>
        </div>

        {/* Editable table */}
        <div className="overflow-x-auto rounded-2xl border border-navy-700/50 bg-card-gradient">
          <table className="border-collapse w-max min-w-full table-fixed">
            <colgroup>
              <col className="w-[110px] min-w-[110px]" />
              {years.map((y) => (
                <col key={y} className="w-[80px] min-w-[80px]" />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-navy-800/60 text-left text-[11px] uppercase tracking-wider text-navy-300">
                <th className="px-3 py-2.5 font-semibold">Deltagare</th>
                {years.map((y) => (
                  <th key={y} className="px-2 py-2.5 font-semibold text-center">{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {store.marathonParticipants.filter((pName) => store.marathonInactive[pName] !== true || Object.keys(store.marathonYearScores[pName] ?? {}).length > 0).map((pName, rowIndex) => {
                const scores = store.marathonYearScores[pName] ?? {};
                const isInactive = store.marathonInactive[pName] === true;
                return (
                  <tr
                    key={pName}
                    className={`border-t border-navy-700/30 ${rowIndex % 2 === 0 ? 'bg-navy-900/30' : 'bg-navy-900/10'}`}
                  >
                    <td className={`px-3 py-1.5 font-medium text-[13px] ${isInactive ? 'text-navy-500' : 'text-navy-100'}`}>
                      <div className="flex items-center gap-2">
                        {editingParticipant === pName ? (
                          <>
                            <input
                              value={editedParticipantName}
                              onChange={(event) => setEditedParticipantName(event.target.value)}
                              className="w-28 px-1 py-0.5 rounded bg-navy-900 border border-navy-700 text-navy-50 text-[11px]"
                              autoFocus
                            />
                            <button onClick={() => handleRenameParticipant(pName)} className="text-[10px] text-gold-300 hover:text-gold-200">Spara</button>
                            <button onClick={() => setEditingParticipant(null)} className="text-[10px] text-navy-400 hover:text-navy-200">Avbryt</button>
                          </>
                        ) : (
                          <>
                            <span>{pName}</span>
                            <button
                              onClick={() => { setEditingParticipant(pName); setEditedParticipantName(pName); }}
                              className="text-[10px] text-navy-400 hover:text-gold-300 transition-colors"
                            >
                              Redigera
                            </button>
                            <button
                              onClick={() => store.setMarathonParticipantActive(pName, isInactive).catch(() => {})}
                              className="text-[10px] text-navy-400 hover:text-gold-300 transition-colors"
                            >
                              {isInactive ? 'Aktivera' : 'Inaktivera'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    {years.map((y) => (
                      <td key={y} className="px-1 py-1 text-center">
                        <input
                          type="number"
                          value={scores[y] ?? 0}
                          onChange={(e) => handleScoreChange(pName, y, e.target.value)}
                          className="w-[60px] px-1.5 py-1.5 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 text-center text-[13px] tabular-nums focus:border-gold-500/50 focus:outline-none transition-colors"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <button
            onClick={onCancel}
            className="px-6 py-3.5 rounded-xl bg-navy-800 text-navy-200 font-semibold text-base border border-navy-600/50 hover:border-navy-500 transition-colors"
          >
            Klar
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Tiebreaker toggle ---
function TiebreakerToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm border transition-colors ${
        checked
          ? 'bg-gold-500/20 text-gold-300 border-gold-500/40'
          : 'bg-navy-800/50 text-navy-300 border-navy-700/30 hover:border-navy-600'
      }`}
    >
      <Star className={`w-4 h-4 ${checked ? 'fill-gold-400 text-gold-400' : ''}`} />
      Utslagsgivare
    </button>
  );
}

// --- New Competition Form ---
function NewCompetitionForm({ onCancel, onSave }: { onCancel: () => void; onSave: (data: { name: string; date: string; description: string; status: CompetitionStatus; isTiebreaker?: boolean; headline?: string; subheadline?: string }) => void }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [isTiebreaker, setIsTiebreaker] = useState(false);

  const canSave = name.trim() && date.trim();

  return (
    <div className="pt-16 lg:pt-20 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button onClick={onCancel} className="inline-flex items-center gap-2 text-navy-300 hover:text-gold-300 text-sm font-medium mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Tillbaka till Admin
        </button>

        <div className="bg-card-gradient rounded-2xl border border-navy-700/50 p-6 lg:p-8">
          <h2 className="font-serif text-2xl font-bold text-navy-50 mb-6">Ny tävling</h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-navy-200 mb-2">Tävlingsnamn</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="T.ex. Premier League"
                className="w-full px-4 py-3 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none transition-colors text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy-200 mb-2">Datum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 focus:border-gold-500/50 focus:outline-none transition-colors text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy-200 mb-2">Huvudrubrik (versaler)</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="T.ex. GOLF"
                className="w-full px-4 py-3 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none transition-colors text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy-200 mb-2">Underrubrik</label>
              <input
                type="text"
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                placeholder="T.ex. US Masters herrar"
                className="w-full px-4 py-3 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none transition-colors text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy-200 mb-2">Utslagsgivare</label>
              <div className="flex gap-3">
                <TiebreakerToggle checked={isTiebreaker} onChange={setIsTiebreaker} />
              </div>
              <p className="text-xs text-navy-500 mt-1.5">Markera om tävlingen kan avgöra delade placeringar.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => canSave && onSave({ name: name.trim(), date, description: name.trim(), status: 'Kommande', isTiebreaker, headline: headline.trim(), subheadline: subheadline.trim() })}
                disabled={!canSave}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-navy-950 font-bold text-base hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-gold-500/20"
              >
                Skapa tävling
              </button>
              <button
                onClick={onCancel}
                className="px-6 py-3.5 rounded-xl bg-navy-800 text-navy-200 font-semibold text-base border border-navy-600/50 hover:border-navy-500 transition-colors"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Edit Competition ---
function EditCompetition({ competitionId, onCancel }: { competitionId: number; onCancel: () => void }) {
  const store = useDataStore();
  const comp = store.getCompetitionById(competitionId);
  const [name, setName] = useState(comp?.name ?? '');
  const [date, setDate] = useState(comp?.date ?? '');
  const [headline, setHeadline] = useState(comp?.headline ?? '');
  const [subheadline, setSubheadline] = useState(comp?.subheadline ?? '');
  const [isTiebreaker, setIsTiebreaker] = useState(comp?.isTiebreaker ?? false);
  const [resultInput, setResultInput] = useState(comp?.result ?? '');
  const [showResultConfirm, setShowResultConfirm] = useState(false);
  const [showResultForm, setShowResultForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'answers' | 'result'>('details');
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (!comp) return null;

  const isFinished = comp.status === 'Avslutad';
  const hasResult = comp.result !== null && comp.result !== '';

  // Unique tip answers for winner picker and eliminated section
  const uniqueAnswers = useMemo(() => {
    const counts = new Map<string, number>();
    comp.tips.forEach((t) => {
      const trimmed = t.tip.trim();
      if (trimmed) {
        counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
      }
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [comp.tips]);

  const handleSaveDetails = async () => {
    try {
      await store.updateCompetition(competitionId, {
        name: name.trim(),
        date,
        description: name.trim(),
        isTiebreaker,
        headline: headline.trim(),
        subheadline: subheadline.trim(),
      });
      onCancel();
    } catch {
      /* error shown via store.saveError */
    }
  };

  const handleSetResult = () => {
    if (hasResult && resultInput !== comp.result) {
      setShowResultConfirm(true);
    } else {
      doSetResult();
    }
  };

  const doSetResult = async () => {
    if (resultInput.trim()) {
      try {
        await store.setCompetitionResult(competitionId, resultInput.trim());
        setShowResultConfirm(false);
        setShowResultForm(false);
      } catch {
        setShowResultConfirm(false);
      }
    }
  };

  const handleClearResult = async () => {
    try {
      await store.clearCompetitionResult(competitionId);
      setResultInput('');
      setShowResultForm(false);
    } catch {
      /* error shown via store.saveError */
    }
  };

  const handleToggleEliminated = async (answer: string) => {
    try {
      await store.toggleEliminatedAnswer(competitionId, answer);
    } catch {
      /* error shown via store.saveError */
    }
  };

  const isEliminated = (answer: string) =>
    comp.eliminatedAnswers.some((ea) => ea.trim() === answer.trim());

  const correctCount = comp.tips.filter((t) => t.points > 0).length;

  return (
    <div ref={topRef} className="pt-16 lg:pt-20 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button onClick={onCancel} className="inline-flex items-center gap-2 text-navy-300 hover:text-gold-300 text-sm font-medium mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Tillbaka till Admin
        </button>

        <div className="bg-card-gradient rounded-2xl border border-navy-700/50 p-6 lg:p-8 mb-6">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h2 className="font-serif text-2xl font-bold text-navy-50">{comp.name}</h2>
            {comp.isTiebreaker && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-500/15 border border-gold-500/30 text-xs text-gold-300 font-semibold">
                <Star className="w-3 h-3" /> Utslagsgivare
              </span>
            )}
            <StatusBadge status={comp.status} />
          </div>
          <p className="text-navy-300 text-sm">{formatDate(comp.date)}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <TabButton label="Detaljer" active={activeTab === 'details'} onClick={() => setActiveTab('details')} />
          <TabButton label="Deltagarsvar" active={activeTab === 'answers'} onClick={() => setActiveTab('answers')} />
          <TabButton label="Resultat" active={activeTab === 'result'} onClick={() => setActiveTab('result')} />
        </div>

        {/* Details tab */}
        {activeTab === 'details' && (
          <div className="bg-card-gradient rounded-2xl border border-navy-700/50 p-6 lg:p-8">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-navy-200 mb-2">Tävlingsnamn</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 focus:border-gold-500/50 focus:outline-none transition-colors text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy-200 mb-2">Datum</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 focus:border-gold-500/50 focus:outline-none transition-colors text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy-200 mb-2">Huvudrubrik (versaler)</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="T.ex. GOLF"
                  className="w-full px-4 py-3 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none transition-colors text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy-200 mb-2">Underrubrik</label>
                <input
                  type="text"
                  value={subheadline}
                  onChange={(e) => setSubheadline(e.target.value)}
                  placeholder="T.ex. US Masters herrar"
                  className="w-full px-4 py-3 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none transition-colors text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy-200 mb-2">Utslagsgivare</label>
                <div className="flex gap-3">
                  <TiebreakerToggle checked={isTiebreaker} onChange={setIsTiebreaker} />
                </div>
                <p className="text-xs text-navy-500 mt-1.5">Markera om tävlingen kan avgöra delade placeringar.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveDetails}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-navy-950 font-bold text-base hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20"
                >
                  Spara ändringar
                </button>
                <button
                  onClick={onCancel}
                  className="px-6 py-3.5 rounded-xl bg-navy-800 text-navy-200 font-semibold text-base border border-navy-600/50 hover:border-navy-500 transition-colors"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Answers tab */}
        {activeTab === 'answers' && (
          <div className="bg-card-gradient rounded-2xl border border-navy-700/50 p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-5">
              <Users className="w-5 h-5 text-gold-400" />
              <h3 className="font-serif text-lg font-bold text-navy-50">Deltagarnas svar</h3>
            </div>
            <p className="text-navy-400 text-sm mb-5">Skriv in eller ändra varje deltagares svar. Gå till nästa fält med Enter eller tab.</p>

            <div className="space-y-2">
              {participantNames.map((pName) => {
                const tip = comp.tips.find((t) => t.name === pName);
                const answer = tip?.tip ?? '';
                const isCorrect = isFinished && comp.result !== null && answer.trim() === comp.result.trim();
                const isElim = !isCorrect && isEliminated(answer);
                return (
                  <div key={pName} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                    isCorrect
                      ? 'bg-gold-500/15 border-gold-500/30'
                      : (isFinished && answer) || isElim
                      ? 'bg-navy-800/30 border-navy-700/20'
                      : 'bg-navy-900/40 border-navy-700/30'
                  }`}>
                    <span className="text-navy-100 font-medium text-sm min-w-[80px] sm:min-w-[100px]">{pName}</span>
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => { store.setParticipantAnswer(competitionId, pName, e.target.value).catch(() => {}); }}
                      placeholder="Inget svar"
                      className="flex-1 px-3 py-2.5 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none transition-colors text-sm"
                    />
                    {isFinished && answer && (
                      isCorrect
                        ? <CheckCircle2 className="w-4 h-4 text-gold-400 flex-shrink-0" />
                        : <XCircle className="w-4 h-4 text-navy-500 flex-shrink-0" />
                    )}
                    {isFinished && isCorrect && (
                      <span className="text-gold-300 font-bold text-sm tabular-nums min-w-[32px] text-right">+{tip?.points}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <button
                onClick={onCancel}
                className="px-6 py-3.5 rounded-xl bg-navy-800 text-navy-200 font-semibold text-base border border-navy-600/50 hover:border-navy-500 transition-colors"
              >
                Klar
              </button>
            </div>
          </div>
        )}

        {/* Result tab */}
        {activeTab === 'result' && (
          <div className="bg-card-gradient rounded-2xl border border-navy-700/50 p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-5">
              <Trophy className="w-5 h-5 text-gold-400" />
              <h3 className="font-serif text-lg font-bold text-navy-50">Resultat / Facit</h3>
            </div>

            {/* Eliminated answers section */}
            {uniqueAnswers.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-navy-200 mb-2">Redan utslagna</h4>
                <p className="text-navy-400 text-xs mb-2">Klicka för att markera/låsa upp. Utslagna svar visas som felaktiga i Tävlingar.</p>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueAnswers.map(([answer, count]) => {
                    const elim = isEliminated(answer);
                    return (
                      <button
                        key={answer}
                        onClick={() => handleToggleEliminated(answer)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          elim
                            ? 'bg-red-500/15 text-red-300 border-red-500/30'
                            : 'bg-navy-800/50 text-navy-200 border-navy-700/30 hover:border-navy-600'
                        }`}
                      >
                        {elim && <X className="w-3 h-3" />}
                        {answer}
                        <span className="text-navy-500 ml-0.5">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Winner picker from tips */}
            {uniqueAnswers.length > 0 && (showResultForm || !isFinished) && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-navy-200 mb-2">Tippade vinnare</h4>
                <p className="text-navy-400 text-xs mb-2">Klicka på ett alternativ för att fylla i vinnarfältet.</p>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueAnswers.map(([answer, count]) => (
                    <button
                      key={answer}
                      onClick={() => setResultInput(answer)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        resultInput.trim() === answer.trim()
                          ? 'bg-gold-500/20 text-gold-300 border-gold-500/40'
                          : 'bg-navy-800/50 text-navy-200 border-navy-700/30 hover:border-gold-500/30 hover:text-gold-300'
                      }`}
                    >
                      {answer}
                      <span className="text-navy-500 ml-0.5">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isFinished && hasResult && !showResultForm ? (
              <div>
                <div className="rounded-lg bg-gold-500/10 border border-gold-500/30 px-4 py-3 mb-4">
                  <span className="text-xs text-navy-400 uppercase tracking-wider font-semibold">Nuvarande facit</span>
                  <p className="text-lg font-serif font-bold text-gradient-gold mt-1">{comp.result}</p>
                  {correctCount === 1
                    ? <p className="text-navy-300 text-sm mt-2">1 deltagare hade rätt ensam och fick 2 poäng.</p>
                    : <p className="text-navy-300 text-sm mt-2">{correctCount} deltagare hade rätt och fick 1 poäng var.</p>}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => { setShowResultForm(true); setResultInput(comp.result ?? ''); }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-navy-800 text-navy-100 font-semibold text-sm border border-navy-600/50 hover:border-gold-500/40 hover:text-gold-300 transition-colors"
                  >
                    Ändra facit
                  </button>
                  <button
                    onClick={handleClearResult}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-navy-800/50 text-navy-300 font-semibold text-sm border border-navy-700/30 hover:border-red-500/40 hover:text-red-300 transition-colors"
                  >
                    Ta bort facit
                  </button>
                </div>
              </div>
            ) : showResultForm || !isFinished ? (
              <div>
                <div className="rounded-lg bg-navy-900/40 border border-navy-700/30 px-4 py-3 mb-4">
                  <p className="text-navy-200 text-sm">
                    <span className="font-semibold text-navy-100">Ange vinnare / facit</span> — skriv det korrekta svaret som deltagarnas tips ska jämföras mot.
                    När du sparar blir tävlingen automatiskt avslutad, alla svar jämförs med facit och poängen räknas ut enligt FLÄRD:s regler.
                  </p>
                </div>
                <label className="block text-sm font-semibold text-navy-200 mb-2">Vinnare / facit</label>
                <input
                  type="text"
                  value={resultInput}
                  onChange={(e) => setResultInput(e.target.value)}
                  placeholder="T.ex. Arsenal"
                  className="w-full px-4 py-3 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none transition-colors text-base mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSetResult}
                    disabled={!resultInput.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-navy-950 font-bold text-base hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-gold-500/20"
                  >
                    {isFinished ? 'Spara nytt facit' : 'Avsluta tävling'}
                  </button>
                  {showResultForm && (
                    <button
                      onClick={() => setShowResultForm(false)}
                      className="px-6 py-3.5 rounded-xl bg-navy-800 text-navy-200 font-semibold text-base border border-navy-600/50 hover:border-navy-500 transition-colors"
                    >
                      Avbryt
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {/* Confirmation dialog */}
            {showResultConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                <div className="max-w-sm w-full rounded-2xl bg-navy-900 border border-gold-500/30 p-6 shadow-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gold-500/15 border border-gold-500/30 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-gold-400" />
                    </div>
                    <h3 className="font-serif text-lg font-bold text-navy-50">Ändra resultat?</h3>
                  </div>
                  <p className="text-navy-300 text-sm mb-6">Detta kommer att påverka deltagarnas poäng och placeringar.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowResultConfirm(false)}
                      className="flex-1 px-5 py-3 rounded-lg bg-navy-800 text-navy-200 font-semibold text-sm border border-navy-600/50 hover:border-navy-500 transition-colors"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={doSetResult}
                      className="flex-1 px-5 py-3 rounded-lg bg-gradient-to-r from-gold-500 to-gold-600 text-navy-950 font-bold text-sm hover:from-gold-400 hover:to-gold-500 transition-all"
                    >
                      Ändra resultat
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
        active
          ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40'
          : 'bg-navy-800/50 text-navy-300 border border-navy-700/30 hover:border-navy-600'
      }`}
    >
      {label}
    </button>
  );
}

// --- Update Form (create / edit) ---
function UpdateForm({
  update,
  onCancel,
  onSave,
}: {
  update?: { id: number; date: string; title: string; subtitle: string; body: string };
  onCancel: () => void;
  onSave: (data: { date: string; title: string; subtitle: string; body: string }) => void;
}) {
  const [date, setDate] = useState(update?.date ?? '');
  const [title, setTitle] = useState(update?.title ?? '');
  const [subtitle, setSubtitle] = useState(update?.subtitle ?? '');
  const [body, setBody] = useState(update?.body ?? '');

  const canSave = date.trim() && title.trim();

  return (
    <div className="pt-16 lg:pt-20 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button onClick={onCancel} className="inline-flex items-center gap-2 text-navy-300 hover:text-gold-300 text-sm font-medium mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Tillbaka till Admin
        </button>

        <div className="bg-card-gradient rounded-2xl border border-navy-700/50 p-6 lg:p-8">
          <h2 className="font-serif text-2xl font-bold text-navy-50 mb-6">
            {update ? 'Redigera uppdatering' : 'Ny uppdatering'}
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-navy-200 mb-2">Datum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 focus:border-gold-500/50 focus:outline-none transition-colors text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy-200 mb-2">Rubrik</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="T.ex. FLÄRD 2026 är igång!"
                className="w-full px-4 py-3 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none transition-colors text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy-200 mb-2">Underrubrik (fet)</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="T.ex. Nu är alla deltagare registrerade"
                className="w-full px-4 py-3 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none transition-colors text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy-200 mb-2">Brödtext</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Skriv uppdateringstexten här..."
                className="w-full px-4 py-3 rounded-lg bg-navy-900/60 border border-navy-700/50 text-navy-50 placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none transition-colors text-base resize-y"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => canSave && onSave({ date, title: title.trim(), subtitle: subtitle.trim(), body: body.trim() })}
                disabled={!canSave}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-navy-950 font-bold text-base hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-gold-500/20"
              >
                {update ? 'Spara ändringar' : 'Skapa uppdatering'}
              </button>
              <button
                onClick={onCancel}
                className="px-6 py-3.5 rounded-xl bg-navy-800 text-navy-200 font-semibold text-base border border-navy-600/50 hover:border-navy-500 transition-colors"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
