import React, { useState, useEffect, useCallback } from 'react';
import { Train, Clock, MapPin, RefreshCw, ArrowRight, AlertCircle, ChevronRight, Bus, TramFront as Tram, Ship, CableCar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Direkt zur API – CORS ist bei transport.opendata.ch erlaubt
const API_BASE = 'https://transport.opendata.ch/v1';

interface Section {
  departure: {
    station: { name: string };
    departure: string;
  };
  arrival: {
    station: { name: string };
    arrival: string;
  };
  journey: { category: string; number: string } | null;
}

interface Connection {
  from: {
    departure: string;
    platform: string | null;
    delay: number | null;
    station: { name: string };
  };
  to: {
    arrival: string;
    station: { name: string };
  };
  sections: Section[];
  products: string[];
  duration: string;
}

interface DestinationState {
  connections: Connection[];
  loading: boolean;
  error: string | null;
}

const STATIONS = {
  ORIGIN: 'Winterthur, Chli-Hegi',
  WINTERTHUR_HB: 'Winterthur, Hauptbahnhof',
  ZURICH_HB: 'Zürich HB',
};

export default function App() {
  const [winterthur, setWinterthur] = useState<DestinationState>({ connections: [], loading: true, error: null });
  const [zurich, setZurich] = useState<DestinationState>({ connections: [], loading: true, error: null });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isReverse, setIsReverse] = useState<boolean>(false);

  const fetchConnections = useCallback(async (
    to: string,
    setState: React.Dispatch<React.SetStateAction<DestinationState>>,
    from: string = STATIONS.ORIGIN
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(
        `${API_BASE}/connections?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=5`
      );
      if (!response.ok) throw new Error('Netzwerkfehler');
      const data = await response.json();
      setState({
        connections: data.connections.map((c: any) => ({
          from: {
            departure: c.from.departure,
            platform: c.from.prognosis?.platform || c.from.platform,
            delay: c.from.delay || 0,
            station: c.from.station,
          },
          to: {
            arrival: c.to.arrival,
            station: c.to.station,
          },
          sections: c.sections.map((s: any) => ({
            departure: {
              station: { name: s.departure.station.name },
              departure: s.departure.prognosis?.departure || s.departure.departure || s.departure.prognosis?.arrival || s.departure.arrival,
            },
            arrival: {
              station: { name: s.arrival.station.name },
              arrival: s.arrival.prognosis?.arrival || s.arrival.arrival || s.arrival.prognosis?.departure || s.arrival.departure,
            },
            journey: s.journey ? { category: s.journey.category, number: s.journey.number } : null,
          })),
          products: c.products || [],
          duration: c.duration,
        })),
        loading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: 'Fehler beim Laden' }));
    }
  }, []);

  const refreshAll = useCallback(() => {
    if (isReverse) {
      fetchConnections(STATIONS.ORIGIN, setWinterthur, STATIONS.WINTERTHUR_HB);
      fetchConnections(STATIONS.ORIGIN, setZurich, STATIONS.ZURICH_HB);
    } else {
      fetchConnections(STATIONS.WINTERTHUR_HB, setWinterthur);
      fetchConnections(STATIONS.ZURICH_HB, setZurich);
    }
    setLastUpdated(new Date());
  }, [fetchConnections, isReverse]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 60000);
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, [refreshAll]);

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <MapPin size={18} />
                <span className="text-sm font-medium uppercase tracking-wider">
                  {isReverse ? 'Rückfahrt nach' : 'Abfahrt von'}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
                Winterthur <span className="text-slate-400 font-light italic">Chli-Hegi</span>
              </h1>
            </div>

            <div className="relative flex items-center bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 shadow-inner">
              <motion.div
                className="absolute h-[calc(100%-8px)] bg-white rounded-lg shadow-sm border border-slate-100"
                initial={false}
                animate={{ left: isReverse ? 'calc(50% + 1px)' : '4px', width: 'calc(50% - 5px)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
              <button
                onClick={() => setIsReverse(false)}
                className={`relative z-10 px-6 py-1.5 rounded-lg text-sm font-bold transition-colors duration-200 ${!isReverse ? 'text-slate-900' : 'text-slate-400 hover:text-slate-500'}`}
              >
                Start
              </button>
              <button
                onClick={() => setIsReverse(true)}
                className={`relative z-10 px-6 py-1.5 rounded-lg text-sm font-bold transition-colors duration-200 ${isReverse ? 'text-slate-900' : 'text-slate-400 hover:text-slate-500'}`}
              >
                Ziel
              </button>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              {currentTime.toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Live</span>
              </div>
              <div className="text-3xl font-mono font-medium text-slate-800">
                {currentTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <RefreshCw size={12} className={winterthur.loading || zurich.loading ? 'animate-spin' : ''} />
              Aktualisiert: {lastUpdated.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <ArrowRight className={`text-slate-400 transition-transform duration-500 ${isReverse ? 'rotate-180' : ''}`} size={20} />
                {isReverse ? 'Von Winterthur HB' : 'Winterthur HB'}
              </h2>
            </div>
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {winterthur.loading && winterthur.connections.length === 0 ? (
                  <LoadingSkeleton />
                ) : winterthur.error ? (
                  <ErrorMessage message={winterthur.error} onRetry={refreshAll} />
                ) : (
                  winterthur.connections.map((conn, idx) => (
                    <ConnectionCard key={`${conn.from.departure}-${idx}`} connection={conn} currentTime={currentTime} />
                  ))
                )}
              </AnimatePresence>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <ArrowRight className={`text-slate-400 transition-transform duration-500 ${isReverse ? 'rotate-180' : ''}`} size={20} />
                {isReverse ? 'Von Zürich HB' : 'Zürich HB'}
              </h2>
            </div>
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {zurich.loading && zurich.connections.length === 0 ? (
                  <LoadingSkeleton />
                ) : zurich.error ? (
                  <ErrorMessage message={zurich.error} onRetry={refreshAll} />
                ) : (
                  zurich.connections.map((conn, idx) => (
                    <ConnectionCard key={`${conn.from.departure}-${idx}`} connection={conn} currentTime={currentTime} />
                  ))
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} Live-Fahrplan • Daten von transport.opendata.ch</p>
        </footer>
      </div>
    </div>
  );
}

interface ConnectionCardProps {
  connection: Connection;
  currentTime: Date;
}

function ConnectionCard({ connection, currentTime }: ConnectionCardProps) {
  const departureTime = new Date(connection.from.departure).getTime() + (connection.from.delay || 0) * 60000;
  const diffMs = departureTime - currentTime.getTime();
  const diffMins = Math.ceil(diffMs / 60000);

  const formatTime = (isoString: string) =>
    new Date(isoString).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });

  const getTransportIcon = (product: string) => {
    const p = product.toLowerCase();
    const cls = 'p-1 bg-slate-100 text-slate-500 rounded-md border border-slate-200/50 flex items-center justify-center';
    if (p.includes('bus') || p.startsWith('b')) return <div className={cls}><Bus size={12} /></div>;
    if (p.includes('tram') || p.startsWith('t')) return <div className={cls}><Tram size={12} /></div>;
    if (p.startsWith('s') || p.includes('zug') || p.includes('ic') || p.includes('ir') || p.includes('ec') || p.includes('ice'))
      return <div className={cls}><Train size={12} /></div>;
    if (p.includes('schiff') || p.includes('bat')) return <div className={cls}><Ship size={12} /></div>;
    if (p.includes('seilbahn') || p.includes('fun')) return <div className={cls}><CableCar size={12} /></div>;
    return <div className={cls}><Train size={12} /></div>;
  };

  const getLineColor = (line: string): { bg: string; text: string } => {
    const l = line.toUpperCase().replace(/^B\s*/, '');
    const busColors: Record<string, { bg: string; text: string }> = {
      '1': { bg: '#e30613', text: '#ffffff' },
      '2': { bg: '#0054a6', text: '#ffffff' },
      '3': { bg: '#ffed00', text: '#000000' },
      '5': { bg: '#009640', text: '#ffffff' },
      '7': { bg: '#d8006f', text: '#ffffff' },
      '10': { bg: '#ee7d00', text: '#ffffff' },
    };
    const sBahnColors: Record<string, { bg: string; text: string }> = {
      'S11': { bg: '#f03c91', text: '#ffffff' },
      'S12': { bg: '#0054a6', text: '#ffffff' },
      'S24': { bg: '#6f286a', text: '#ffffff' },
      'S35': { bg: '#9b5d2a', text: '#ffffff' },
      'S7':  { bg: '#ffed00', text: '#000000' },
      'S8':  { bg: '#000000', text: '#ffffff' },
    };
    const trainColors: Record<string, { bg: string; text: string }> = {
      'IR': { bg: '#e30613', text: '#ffffff' },
      'IC': { bg: '#e30613', text: '#ffffff' },
      'RE': { bg: '#e30613', text: '#ffffff' },
      'EC': { bg: '#e30613', text: '#ffffff' },
      'ICE': { bg: '#e30613', text: '#ffffff' },
    };
    const category = l.replace(/[0-9]/g, '');
    if (trainColors[category]) return trainColors[category];
    if (busColors[l]) return busColors[l];
    if (sBahnColors[l]) return sBahnColors[l];
    if (l.startsWith('S')) return { bg: '#0054a6', text: '#ffffff' };
    if (l.length <= 3 || line.toUpperCase().startsWith('B')) return { bg: '#ffed00', text: '#000000' };
    return { bg: '#334155', text: '#ffffff' };
  };

  const allLines = connection.sections
    .map(s => s.journey ? `${s.journey.category}${s.journey.number}` : null)
    .filter((val, i, self) => val !== null && self.indexOf(val) === i) as string[];

  const normalizeStation = (name: string) =>
    name.replace(/, Hauptbahnhof/g, '').replace(/ HB/g, '').replace(/, /g, ' ').trim();

  const transfersMap = new Map<string, { firstArrival: string; lastDeparture: string }>();
  connection.sections.forEach(s => {
    const arr = normalizeStation(s.arrival.station.name);
    const dep = normalizeStation(s.departure.station.name);
    if (!transfersMap.has(arr)) transfersMap.set(arr, { firstArrival: s.arrival.arrival, lastDeparture: '' });
    const d = transfersMap.get(dep);
    if (d) d.lastDeparture = s.departure.departure;
    else transfersMap.set(dep, { firstArrival: '', lastDeparture: s.departure.departure });
  });

  const transfers = Array.from(transfersMap.entries())
    .map(([norm, data]) => {
      if (!data.firstArrival || !data.lastDeparture) return null;
      const waitTime = Math.round(
        (new Date(data.lastDeparture).getTime() - new Date(data.firstArrival).getTime()) / 60000
      );
      const orig = connection.sections.find(
        s => normalizeStation(s.arrival.station.name) === norm || normalizeStation(s.departure.station.name) === norm
      );
      return { name: orig?.arrival.station.name || orig?.departure.station.name || norm, waitTime: Math.max(0, waitTime) };
    })
    .filter((t): t is { name: string; waitTime: number } => {
      if (!t) return false;
      return (
        normalizeStation(t.name) !== normalizeStation(connection.to.station.name) &&
        normalizeStation(t.name) !== normalizeStation(connection.from.station.name) &&
        t.waitTime > 0
      );
    });

  const primaryProduct = allLines[0] || 'Zug';
  const isBus = primaryProduct.toLowerCase().includes('bus') || primaryProduct.toLowerCase().startsWith('b');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-default"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl p-3 min-w-[70px]">
              <span className="text-2xl font-bold tabular-nums">{formatTime(connection.from.departure)}</span>
              {connection.from.delay && connection.from.delay > 0 ? (
                <span className="text-xs font-bold text-red-500">+{connection.from.delay}'</span>
              ) : (
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">On Time</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {allLines.map((line, i) => {
                    const colors = getLineColor(line);
                    return (
                      <React.Fragment key={i}>
                        <div className="flex items-center gap-1">
                          {getTransportIcon(line)}
                          <span
                            className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider"
                            style={{ backgroundColor: colors.bg, color: colors.text }}
                          >
                            {line}
                          </span>
                        </div>
                        {i < allLines.length - 1 && <ChevronRight size={10} className="text-slate-300" />}
                      </React.Fragment>
                    );
                  })}
                  {allLines.length === 0 && (
                    <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                      {primaryProduct}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-slate-500 ml-1">
                  {connection.from.platform ? `${isBus ? 'Kante' : 'Gleis'} ${connection.from.platform}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-400 text-xs">
                <Clock size={12} />
                <span>Dauer: {connection.duration.replace('00d', '').replace('00:', '').replace(':00', '')} min</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-semibold ${diffMins <= 5 && diffMins > 0 ? 'text-orange-500' : diffMs < 0 ? 'text-slate-300' : 'text-slate-400'}`}>
              {diffMs < 0 ? 'Abgefahren' : diffMs < 60000 ? 'Jetzt' : `in ${diffMins} min`}
            </div>
            <div className="text-[10px] text-slate-300 uppercase font-bold mt-1">
              Ankunft {formatTime(connection.to.arrival)}
            </div>
          </div>
        </div>

        {transfers.length > 0 && (
          <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Umsteigen:</span>
            <div className="flex flex-wrap gap-2">
              {transfers.map((t, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  <span className="text-xs text-slate-700 font-medium">
                    {t.name.replace(', Hauptbahnhof', ' HB').replace('Winterthur, ', '')}
                  </span>
                  <span className="text-[10px] text-slate-400 bg-white px-1 rounded border border-slate-200/50 font-mono">
                    {t.waitTime}'
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-[70px] h-[60px] bg-slate-100 rounded-xl" />
              <div className="space-y-2">
                <div className="w-24 h-4 bg-slate-100 rounded" />
                <div className="w-16 h-3 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="w-16 h-4 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
      <AlertCircle className="text-red-400 mx-auto mb-3" size={32} />
      <p className="text-red-800 font-medium mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
      >
        Erneut versuchen
      </button>
    </div>
  );
}