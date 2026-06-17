'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useInView, useReducedMotion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import {
  Activity, AlertCircle, AlertTriangle, CheckCircle, ChevronRight, Clock,
  Cpu, Database, ExternalLink, Globe, Lock, Radio, Search, Server, Shield,
  TrendingUp, Wifi, Zap,
} from 'lucide-react';

// ── DATA ─────────────────────────────────────────────────────────────────────

const CHART_DATA = [
  { month: 'Jan', alokasi: 420, distribusi: 390 },
  { month: 'Feb', alokasi: 480, distribusi: 450 },
  { month: 'Mar', alokasi: 510, distribusi: 488 },
  { month: 'Apr', alokasi: 530, distribusi: 501 },
  { month: 'Mei', alokasi: 560, distribusi: 534 },
  { month: 'Jun', alokasi: 590, distribusi: 561 },
];

const NETWORK_DATA = [
  { t: '00:00', tps: 12 }, { t: '04:00', tps: 8 }, { t: '08:00', tps: 31 },
  { t: '10:00', tps: 47 }, { t: '12:00', tps: 52 }, { t: '14:00', tps: 44 },
  { t: '16:00', tps: 38 }, { t: '18:00', tps: 29 }, { t: '20:00', tps: 19 },
  { t: '22:00', tps: 14 },
];

const PRIORITY_SCHOOLS = [
  { nama: 'SDN 01 Menteng', kota: 'Jakarta Pusat', anggaran: 'Rp 121,0 Jt', status: 'Aktif', pct: 94 },
  { nama: 'SDN Cipete Utara 02', kota: 'Jakarta Selatan', anggaran: 'Rp 97,5 Jt', status: 'Aktif', pct: 91 },
  { nama: 'SMPN 3 Bandung', kota: 'Kota Bandung', anggaran: 'Rp 96,0 Jt', status: 'Aktif', pct: 88 },
  { nama: 'SDN Kebayoran Baru 01', kota: 'Jakarta Selatan', anggaran: 'Rp 84,6 Jt', status: 'Proses', pct: 62 },
  { nama: 'SDN 012 Samarinda Ulu', kota: 'Kota Samarinda', anggaran: 'Rp 82,7 Jt', status: 'Aktif', pct: 85 },
  { nama: 'SMKN 2 Surabaya', kota: 'Kota Surabaya', anggaran: 'Rp 74,2 Jt', status: 'Aktif', pct: 79 },
];

const ESCROWS = [
  { id: 8145, school: 'SDN 01 Menteng', catering: 'CV Berkah Pangan', amount: 121000000, status: 'Terkunci', lockedAt: '2025-01-03', txHash: '0x3fa8c2d1e9b4a7f6c0d3e8a2b1c4f5d6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2', block: 7841203 },
  { id: 8144, school: 'SDN Cipete Utara 02', catering: 'PT Mitra Kuliner Nusantara', amount: 97500000, status: 'Tercairkan', lockedAt: '2025-01-02', txHash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', block: 7841187 },
  { id: 8143, school: 'SMPN 3 Bandung', catering: 'UD Dapur Sehat Bandung', amount: 96000000, status: 'Terkunci', lockedAt: '2025-01-02', txHash: '0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3', block: 7841094 },
  { id: 8142, school: 'SDN Kebayoran Baru 01', catering: 'CV Berkah Pangan', amount: 84600000, status: 'Menunggu Rilis', lockedAt: '2025-01-01', txHash: '0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4', block: 7840951 },
  { id: 8141, school: 'SDN 012 Samarinda Ulu', catering: 'PT Gizi Prima Kaltim', amount: 82700000, status: 'Tercairkan', lockedAt: '2024-12-30', txHash: '0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5', block: 7840702 },
  { id: 8140, school: 'SMKN 2 Surabaya', catering: 'CV Sumber Gizi Jaya', amount: 74200000, status: 'Tertunda', lockedAt: '2024-12-29', txHash: '0xe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6', block: 7840511 },
  { id: 8139, school: 'SDN Rawamangun 01', catering: 'PT Mitra Kuliner Nusantara', amount: 68900000, status: 'Terkunci', lockedAt: '2024-12-28', txHash: '0xf6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7', block: 7840388 },
  { id: 8138, school: 'SMAN 5 Yogyakarta', catering: 'UD Dapur Jogja Sejahtera', amount: 63400000, status: 'Tercairkan', lockedAt: '2024-12-27', txHash: '0xa7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8', block: 7840201 },
];

const STATS = { totalTerkunci: 299700000, totalTercair: 237100000, pendingRelease: 84600000 };

const LOG_ENTRIES = [
  { time: '14:32:07', msg: 'Block #7841203 confirmed — escrow #8145 locked', type: 'info' },
  { time: '14:31:55', msg: 'Smart contract validation passed for SDN 01 Menteng', type: 'success' },
  { time: '14:29:41', msg: 'Release condition verified — escrow #8144 disbursed', type: 'success' },
  { time: '14:27:18', msg: 'Awaiting oracle confirmation — escrow #8142', type: 'warn' },
  { time: '14:21:03', msg: 'Gas fee optimized: 0.0012 ETH saved on batch tx', type: 'info' },
  { time: '14:18:44', msg: 'Network latency spike detected (142ms → resolved)', type: 'warn' },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  Terkunci:         { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.22)', dot: '#38bdf8' },
  'Menunggu Rilis': { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.22)', dot: '#fbbf24' },
  Tercairkan:       { color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.22)', dot: '#34d399' },
  Tertunda:         { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.22)', dot: '#f87171' },
};

// ── SUBCOMPONENTS ─────────────────────────────────────────────────────────────

function LiveTicker() {
  const items = [
    'BLOCK #7841203 CONFIRMED', 'TX 0x3fa8...b1c2 LOCKED', 'ESCROW #8144 DISBURSED',
    'NETWORK: ETHEREUM SEPOLIA', 'GAS: 18 GWEI', 'LATENCY: 42ms',
    'VALIDATORS: 512/512 ONLINE', 'SMART CONTRACT: AUDITED', 'UPTIME: 99.97%',
    'TOTAL DISBURSED: RP 237,1 JT', 'ACTIVE ESCROWS: 3', 'LAST BLOCK: 4s AGO',
  ];
  const [pos, setPos] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPos(p => p - 1), 30);
    return () => clearInterval(id);
  }, []);
  const full = [...items, ...items].join('   ◆   ');
  return (
    <div style={{ background: 'rgba(56,189,248,0.06)', borderTop: '1px solid rgba(56,189,248,0.1)', borderBottom: '1px solid rgba(56,189,248,0.1)', overflow: 'hidden', height: 30, display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 12, flexShrink: 0, borderRight: '1px solid rgba(56,189,248,0.2)', paddingRight: 12, height: '100%' }}>
        <Radio size={11} style={{ color: '#38bdf8' }} className="animate-pulse" />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#38bdf8', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>LIVE FEED</span>
      </div>
      <div style={{ overflow: 'hidden', flex: 1, position: 'relative' }}>
        <motion.div
          style={{ display: 'flex', whiteSpace: 'nowrap', x: pos }}
          transition={{ ease: 'linear' }}
        >
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(56,189,248,0.7)', letterSpacing: '0.06em', paddingLeft: 24 }}>
            {full}
          </span>
        </motion.div>
      </div>
    </div>
  );
}

function HexCorner({ top, left, right, bottom, color = 'rgba(56,189,248,0.5)' }: any) {
  return (
    <div style={{
      position: 'absolute', ...(top !== undefined ? { top } : {}), ...(bottom !== undefined ? { bottom } : {}),
      ...(left !== undefined ? { left } : {}), ...(right !== undefined ? { right } : {}),
      width: 20, height: 20,
      borderTop: top !== undefined ? `1.5px solid ${color}` : 'none',
      borderBottom: bottom !== undefined ? `1.5px solid ${color}` : 'none',
      borderLeft: left !== undefined ? `1.5px solid ${color}` : 'none',
      borderRight: right !== undefined ? `1.5px solid ${color}` : 'none',
    }} />
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 3, height: 14, background: '#38bdf8', borderRadius: 2 }} />
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#38bdf8', fontFamily: 'monospace', textTransform: 'uppercase' }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(56,189,248,0.25), transparent)' }} />
    </div>
  );
}

function PanelCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      position: 'relative',
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(56,189,248,0.1)',
      borderRadius: 10,
      ...style,
    }}>
      <HexCorner top={-1} left={-1} />
      <HexCorner top={-1} right={-1} />
      <HexCorner bottom={-1} left={-1} />
      <HexCorner bottom={-1} right={-1} />
      {children}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const heroRef    = useRef(null);
  const aboutRef   = useRef(null);
  const chartRef   = useRef(null);
  const contentRef = useRef(null);
  const tableRef   = useRef(null);

  const heroInView    = useInView(heroRef,    { once: true, amount: 0.2 });
  const aboutInView   = useInView(aboutRef,   { once: true, amount: 0.2 });
  const chartInView   = useInView(chartRef,   { once: true, amount: 0.15 });
  const contentInView = useInView(contentRef, { once: true, amount: 0.2 });
  const tableInView   = useInView(tableRef,   { once: true, amount: 0.1 });

  const { scrollY } = useScroll();
  const heroY  = useTransform(scrollY, [0, 600], [0, 90]);
  const heroOp = useTransform(scrollY, [0, 400], [1, 0]);

  const shouldReduceMotion = useReducedMotion();

  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('');
  const [page,    setPage]    = useState(1);
  const [clock,   setClock]   = useState('');
  const PER_PAGE = 6;

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('id-ID', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const filtered = ESCROWS.filter(e => {
    const q = search.toLowerCase();
    return (e.school.toLowerCase().includes(q) || e.catering.toLowerCase().includes(q) || e.txHash.includes(q))
      && (filter === '' || e.status === filter);
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // colors
  const BG    = '#030a12';
  const BG2   = '#050e18';
  const CYAN  = '#38bdf8';
  const GREEN = '#34d399';
  const AMBER = '#fbbf24';
  const TEXT  = '#94a3b8';
  const HI    = '#e2e8f0';

  const GRID_BG: React.CSSProperties = {
    backgroundImage: `
      linear-gradient(rgba(56,189,248,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56,189,248,0.03) 1px, transparent 1px)`,
    backgroundSize: '36px 36px',
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT, fontFamily: 'system-ui, sans-serif' }}>
      <Navbar role="public" />
      <LiveTicker />

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{ ...GRID_BG, background: BG, position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>

        {/* background glow pools */}
        <div style={{ position:'absolute', top:'15%', left:'8%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 60%)', filter:'blur(60px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'10%', right:'5%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 60%)', filter:'blur(60px)', pointerEvents:'none' }} />

        {/* top-left HUD clock */}
        <div style={{ position:'absolute', top:20, right:24, display:'flex', alignItems:'center', gap:8, zIndex:2 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:GREEN, boxShadow:`0 0 8px ${GREEN}` }} className="animate-pulse" />
          <span style={{ fontFamily:'monospace', fontSize:12, color: CYAN, letterSpacing:'0.1em' }}>SYS // {clock} WIB</span>
        </div>

        <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 28px', width:'100%', zIndex:1 }}>
          <div className="grid lg:grid-cols-2 gap-16 items-center" style={{ display:'grid', gap:64 }}>

            {/* LEFT — text */}
            <motion.div style={{ display:'flex', flexDirection:'column', gap:24 }}
              initial={{ opacity:0, x: shouldReduceMotion ? 0 : -48 }}
              animate={heroInView ? { opacity:1, x:0 } : {}}
              transition={{ duration:0.9, ease:[0.16,1,0.3,1] }}>

              {/* system badge */}
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', border:'1px solid rgba(56,189,248,0.2)', borderRadius:4, background:'rgba(56,189,248,0.05)' }}>
                  <Cpu size={11} style={{ color: CYAN }} />
                  <span style={{ fontFamily:'monospace', fontSize:10, color: CYAN, letterSpacing:'0.1em' }}>CONTRACT://MBG-ESCROW-V2.1</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', border:'1px solid rgba(52,211,153,0.2)', borderRadius:4, background:'rgba(52,211,153,0.05)' }}>
                  <Wifi size={10} style={{ color: GREEN }} />
                  <span style={{ fontFamily:'monospace', fontSize:10, color: GREEN, letterSpacing:'0.1em' }}>ONLINE</span>
                </div>
              </div>

              <div>
                <h1 style={{ fontSize:'clamp(2.4rem,5.5vw,4rem)', fontWeight:800, lineHeight:1.08, margin:0, letterSpacing:'-0.03em', color: HI }}>
                  Transparansi<br />
                  <span style={{ color: CYAN }}>Distribusi Pangan</span>
                </h1>
                <h1 style={{ fontSize:'clamp(2.4rem,5.5vw,4rem)', fontWeight:800, lineHeight:1.08, margin:0, letterSpacing:'-0.03em', color: HI }}>
                  Berbasis Blockchain
                </h1>
              </div>

              <p style={{ fontSize:'1.05rem', lineHeight:1.8, color: TEXT, maxWidth:480, margin:0 }}>
                Setiap rupiah Program Makan Bergizi Gratis tercatat permanen di Ethereum — transparan,
                immutable, dan dapat diverifikasi publik secara real-time.
              </p>

              {/* mini stats row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, paddingTop:4 }}>
                {[
                  { label:'Total Escrow', val:'Rp 621 Jt', icon: Database, c: CYAN },
                  { label:'Distribusi', val:'95.2%', icon: TrendingUp, c: GREEN },
                  { label:'Blok Aktif', val:'#7.84 Jt', icon: Activity, c: AMBER },
                ].map(({ label, val, icon: Icon, c }) => (
                  <div key={label} style={{ padding:'12px 14px', border:`1px solid ${c}18`, background:`${c}06`, borderRadius:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                      <Icon size={12} style={{ color: c }} />
                      <span style={{ fontSize:10, color: c, fontWeight:600, letterSpacing:'0.08em', fontFamily:'monospace' }}>{label.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize:'1.1rem', fontWeight:700, color: HI, fontVariantNumeric:'tabular-nums' }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* feature tags */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {['Smart Contract Audited','Zero-Knowledge Proof','Multi-Sig Validation','On-Chain Oracle'].map(t => (
                  <span key={t} style={{ fontSize:11, padding:'4px 10px', borderRadius:4, border:'1px solid rgba(56,189,248,0.15)', color:'rgba(56,189,248,0.65)', fontFamily:'monospace', letterSpacing:'0.03em' }}>
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* RIGHT — image + overlay panels */}
            <motion.div style={{ position:'relative', y: heroY, opacity: heroOp }}
              initial={{ opacity:0, scale:0.88 }}
              animate={heroInView ? { opacity:1, scale:1 } : {}}
              transition={{ delay:0.2, duration:1, ease:[0.16,1,0.3,1] }}>

              {/* main image */}
              <div style={{ position:'relative', borderRadius:12, overflow:'hidden', border:'1px solid rgba(56,189,248,0.15)', boxShadow:'0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(56,189,248,0.05)' }}>
                <img src="/aesthetic view.jpg" alt="Program MBG" style={{ width:'100%', height:460, objectFit:'cover', display:'block' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(3,10,18,0.5) 0%, transparent 50%, rgba(3,10,18,0.6) 100%)' }} />
                {/* scan line */}
                <motion.div style={{ position:'absolute', left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(56,189,248,0.6),transparent)', top:0 }}
                  animate={{ top:['0%','100%'] }} transition={{ duration:3.5, repeat:Infinity, ease:'linear', repeatDelay:1 }} />
                <HexCorner top={10} left={10} />
                <HexCorner top={10} right={10} />
                <HexCorner bottom={10} left={10} />
                <HexCorner bottom={10} right={10} />
              </div>

              {/* floating HUD panel — top left */}
              <motion.div
                style={{ position:'absolute', top:-18, left:-20, padding:'10px 14px', background:'rgba(3,10,18,0.92)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:8, backdropFilter:'blur(12px)', minWidth:170 }}
                animate={{ y:[0,-5,0] }} transition={{ duration:4, repeat:Infinity, ease:'easeInOut' }}>
                <div style={{ fontSize:9, color:CYAN, fontFamily:'monospace', letterSpacing:'0.1em', marginBottom:6 }}>NETWORK STATUS</div>
                {[{ k:'Validator Nodes', v:'512 / 512', c: GREEN },{ k:'Block Time', v:'12.3s', c: CYAN },{ k:'Finality', v:'2 epochs', c: AMBER }].map(r => (
                  <div key={r.k} style={{ display:'flex', justifyContent:'space-between', gap:16, marginBottom:3 }}>
                    <span style={{ fontSize:10, color: TEXT, fontFamily:'monospace' }}>{r.k}</span>
                    <span style={{ fontSize:10, color: r.c, fontFamily:'monospace', fontWeight:600 }}>{r.v}</span>
                  </div>
                ))}
              </motion.div>

              {/* floating HUD panel — bottom right */}
              <motion.div
                style={{ position:'absolute', bottom:-16, right:-20, padding:'10px 14px', background:'rgba(3,10,18,0.92)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:8, backdropFilter:'blur(12px)', minWidth:160 }}
                animate={{ y:[0,5,0] }} transition={{ duration:4.5, repeat:Infinity, ease:'easeInOut', delay:0.5 }}>
                <div style={{ fontSize:9, color: GREEN, fontFamily:'monospace', letterSpacing:'0.1em', marginBottom:6 }}>CONTRACT HEALTH</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <div style={{ flex:1, height:3, borderRadius:2, background:'rgba(52,211,153,0.15)', overflow:'hidden' }}>
                    <div style={{ width:'97%', height:'100%', background: GREEN, borderRadius:2 }} />
                  </div>
                  <span style={{ fontSize:10, color: GREEN, fontFamily:'monospace' }}>97%</span>
                </div>
                <span style={{ fontSize:10, color: TEXT, fontFamily:'monospace' }}>All systems nominal</span>
              </motion.div>

              {/* ambient glow */}
              <motion.div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)', filter:'blur(30px)', pointerEvents:'none' }}
                animate={{ scale:[1,1.3,1], opacity:[0.4,0.7,0.4] }} transition={{ duration:5, repeat:Infinity, ease:'easeInOut' }} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── ABOUT + LOG PANEL ────────────────────────────────────────────── */}
      <section ref={aboutRef} style={{ background: BG2, padding:'80px 28px', position:'relative', overflow:'hidden' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 360px', gap:32, alignItems:'start' }}
          className="grid lg:grid-cols-[1fr_360px]">
          {/* left — about */}
          <motion.div initial={{ opacity:0, y:28 }} animate={aboutInView ? { opacity:1, y:0 } : {}} transition={{ duration:0.7, ease:[0.16,1,0.3,1] }}>
            <SectionLabel>System Overview // MBG Protocol</SectionLabel>
            <h2 style={{ fontSize:'clamp(1.9rem,4vw,2.8rem)', fontWeight:750, color: HI, letterSpacing:'-0.025em', margin:'0 0 20px', lineHeight:1.2 }}>
              Apa Itu<br /><span style={{ color: CYAN }}>MBG?</span>
            </h2>
            <PanelCard style={{ padding:'28px 32px' }}>
              <p style={{ fontSize:'1.02rem', lineHeight:1.85, color: TEXT, margin:'0 0 20px' }}>
                Program Makan Bergizi Gratis (MBG) merupakan program makan siang gratis Indonesia yang
                berjalan sejak 6 Januari 2025 di bawah pemerintahan Presiden Prabowo Subianto.
                Program ini menargetkan para pelajar, ibu hamil, dan kelompok rentan lainnya.
              </p>
              <div style={{ height:1, background:'rgba(56,189,248,0.08)', margin:'0 0 20px' }} />
              <p style={{ fontSize:'1.02rem', lineHeight:1.85, color: TEXT, margin:0 }}>
                Platform ini merupakan lapisan transparansi berbasis blockchain yang memastikan setiap
                dana tersalurkan tepat sasaran. Setiap transaksi dieksekusi melalui smart contract
                dan tercatat secara permanen — dapat diaudit siapa saja, kapan saja, tanpa izin.
              </p>
            </PanelCard>
          </motion.div>

          {/* right — live log */}
          <motion.div initial={{ opacity:0, x:28 }} animate={aboutInView ? { opacity:1, x:0 } : {}} transition={{ delay:0.15, duration:0.7, ease:[0.16,1,0.3,1] }}>
            <SectionLabel>System Log // Live Feed</SectionLabel>
            <PanelCard>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(56,189,248,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <Server size={12} style={{ color: CYAN }} />
                  <span style={{ fontFamily:'monospace', fontSize:11, color: CYAN }}>node-01.mbg.eth</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background: GREEN }} className="animate-pulse" />
                  <span style={{ fontFamily:'monospace', fontSize:10, color: GREEN }}>RUNNING</span>
                </div>
              </div>
              <div style={{ padding:'12px 0' }}>
                {LOG_ENTRIES.map((l, i) => (
                  <motion.div key={i}
                    initial={{ opacity:0, x:10 }} animate={aboutInView ? { opacity:1, x:0 } : {}}
                    transition={{ delay:0.2 + i * 0.07 }}
                    style={{ padding:'6px 16px', display:'flex', gap:10, alignItems:'flex-start', borderBottom: i < LOG_ENTRIES.length-1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                    <span style={{ fontFamily:'monospace', fontSize:10, color:'rgba(56,189,248,0.4)', whiteSpace:'nowrap', paddingTop:1 }}>{l.time}</span>
                    <div style={{ width:5, height:5, borderRadius:'50%', marginTop:4, flexShrink:0,
                      background: l.type==='success' ? GREEN : l.type==='warn' ? AMBER : CYAN,
                      boxShadow: `0 0 6px ${l.type==='success' ? GREEN : l.type==='warn' ? AMBER : CYAN}` }} />
                    <span style={{ fontFamily:'monospace', fontSize:10.5, color: l.type==='warn' ? AMBER : l.type==='success' ? GREEN : TEXT, lineHeight:1.6 }}>{l.msg}</span>
                  </motion.div>
                ))}
              </div>
            </PanelCard>
          </motion.div>
        </div>
      </section>

      {/* ── CHART SECTION ────────────────────────────────────────────────── */}
      <section ref={chartRef} style={{ ...GRID_BG, background: BG, padding:'80px 28px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <motion.div initial={{ opacity:0, y:28 }} animate={chartInView ? { opacity:1, y:0 } : {}} transition={{ duration:0.7 }}>
            <SectionLabel>Data Analytics // Allocation &amp; Distribution</SectionLabel>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:24, alignItems:'start' }}>
              {/* main bar chart */}
              <div>
                <h2 style={{ fontSize:'clamp(1.6rem,3.5vw,2.2rem)', fontWeight:750, color: HI, letterSpacing:'-0.02em', margin:'0 0 24px' }}>
                  Status Alokasi &amp; Distribusi Dana
                </h2>
                <PanelCard style={{ padding:'24px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                    <span style={{ fontFamily:'monospace', fontSize:11, color:'rgba(56,189,248,0.5)' }}>JAN–JUN 2025 // JUTAAN IDR</span>
                    <div style={{ display:'flex', gap:16 }}>
                      {[{l:'Alokasi',c:CYAN},{l:'Distribusi',c:'#818cf8'}].map(x=>(
                        <div key={x.l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:x.c }} />
                          <span style={{ fontSize:11, color: TEXT, fontFamily:'monospace' }}>{x.l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={CHART_DATA} barGap={4} margin={{ top:0, right:0, left:-10, bottom:0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(56,189,248,0.06)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill:'rgba(56,189,248,0.45)', fontSize:11, fontFamily:'monospace' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:'rgba(56,189,248,0.45)', fontSize:11, fontFamily:'monospace' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background:'#070f1a', border:'1px solid rgba(56,189,248,0.2)', borderRadius:8, color: HI, fontSize:12, fontFamily:'monospace' }} cursor={{ fill:'rgba(56,189,248,0.04)' }} formatter={(v:any)=>[`${v} Jt`,'']} />
                      <Bar dataKey="alokasi" fill={CYAN} radius={[4,4,0,0]} animationDuration={1200} />
                      <Bar dataKey="distribusi" fill="#818cf8" radius={[4,4,0,0]} animationDuration={1200} animationBegin={150} />
                    </BarChart>
                  </ResponsiveContainer>
                </PanelCard>
              </div>

              {/* right col — network activity + mini stats */}
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <h2 style={{ fontSize:'clamp(1.6rem,3.5vw,2.2rem)', fontWeight:750, color:'transparent', letterSpacing:'-0.02em', margin:'0 0 24px', userSelect:'none' }}>&nbsp;</h2>
                <PanelCard style={{ padding:'16px 18px' }}>
                  <div style={{ fontSize:10, fontFamily:'monospace', color:'rgba(56,189,248,0.5)', letterSpacing:'0.1em', marginBottom:12 }}>NETWORK TXN / HR</div>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={NETWORK_DATA} margin={{ top:0, right:0, left:-32, bottom:0 }}>
                      <defs>
                        <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CYAN} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(56,189,248,0.05)" vertical={false} />
                      <XAxis dataKey="t" tick={{ fill:'rgba(56,189,248,0.3)', fontSize:9, fontFamily:'monospace' }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ background:'#070f1a', border:'1px solid rgba(56,189,248,0.15)', borderRadius:6, color: HI, fontSize:11, fontFamily:'monospace' }} />
                      <Area type="monotone" dataKey="tps" stroke={CYAN} strokeWidth={1.5} fill="url(#netGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </PanelCard>

                {[
                  { label:'Efisiensi Dana', val:'95.2%', sub:'↑ 1.3% vs bulan lalu', c: GREEN, icon: TrendingUp },
                  { label:'Avg Gas Cost', val:'18 GWEI', sub:'Optimized batch tx', c: AMBER, icon: Zap },
                  { label:'Smart Contracts', val:'3 Active', sub:'Audited by CertiK', c: CYAN, icon: Globe },
                ].map(({ label, val, sub, c, icon: Icon }) => (
                  <PanelCard key={label} style={{ padding:'14px 18px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ fontSize:10, fontFamily:'monospace', color:`${c}80`, letterSpacing:'0.08em', marginBottom:4 }}>{label.toUpperCase()}</div>
                        <div style={{ fontSize:'1.15rem', fontWeight:700, color: HI, fontVariantNumeric:'tabular-nums' }}>{val}</div>
                        <div style={{ fontSize:10, color: TEXT, marginTop:2 }}>{sub}</div>
                      </div>
                      <div style={{ width:30, height:30, borderRadius:6, background:`${c}10`, border:`1px solid ${c}20`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Icon size={14} style={{ color: c }} />
                      </div>
                    </div>
                  </PanelCard>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── BLOCKCHAIN CONTENT ───────────────────────────────────────────── */}
      <section ref={contentRef} style={{ background: BG2, padding:'80px 28px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}
          className="grid lg:grid-cols-2">
          <motion.div style={{ display:'flex', flexDirection:'column', gap:22 }}
            initial={{ opacity:0, x: shouldReduceMotion ? 0 : -32 }}
            animate={contentInView ? { opacity:1, x:0 } : {}}
            transition={{ duration:0.75, ease:[0.16,1,0.3,1] }}>
            <SectionLabel>Technology Layer // On-Chain</SectionLabel>
            <h2 style={{ fontSize:'clamp(1.9rem,4vw,2.8rem)', fontWeight:750, color: HI, letterSpacing:'-0.025em', margin:0, lineHeight:1.2 }}>
              Blockchain untuk<br /><span style={{ color: CYAN }}>Transparansi Maksimal</span>
            </h2>
            <p style={{ fontSize:'1.02rem', lineHeight:1.85, color: TEXT, margin:0 }}>
              Setiap alokasi dan distribusi dana tercatat secara permanen dan tidak dapat dimanipulasi.
              Smart contract mengeksekusi pembayaran otomatis berdasarkan kondisi on-chain yang terverifikasi —
              tanpa perantara, tanpa kebocoran.
            </p>
            <div style={{ height:1, background:'rgba(56,189,248,0.07)' }} />
            <h3 style={{ fontSize:'1.15rem', fontWeight:650, color: HI, margin:0 }}>Akuntabilitas Ujung ke Ujung</h3>
            <p style={{ fontSize:'1.02rem', lineHeight:1.85, color: TEXT, margin:0 }}>
              Visibilitas penuh dari pemerintah, katering, hingga sekolah penerima. Masyarakat dapat
              memantau distribusi secara real-time dan memverifikasi setiap transaksi langsung di Etherscan.
            </p>

            {/* tech stack pills */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, paddingTop:4 }}>
              {[
                { label:'Ethereum Sepolia', c: CYAN },
                { label:'Solidity 0.8.x', c:'#818cf8' },
                { label:'Chainlink Oracle', c: AMBER },
                { label:'IPFS Metadata', c: GREEN },
                { label:'Multi-Sig Gnosis', c:'#f472b6' },
              ].map(p => (
                <span key={p.label} style={{ fontSize:11, padding:'4px 10px', borderRadius:4, border:`1px solid ${p.c}25`, color:`${p.c}cc`, fontFamily:'monospace', background:`${p.c}06` }}>
                  {p.label}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity:0, x: shouldReduceMotion ? 0 : 32 }}
            animate={contentInView ? { opacity:1, x:0 } : {}}
            transition={{ delay:0.15, duration:0.75, ease:[0.16,1,0.3,1] }}>
            <div style={{ position:'relative', borderRadius:12, overflow:'hidden', border:'1px solid rgba(99,102,241,0.18)', boxShadow:'0 24px 64px rgba(0,0,0,0.7)' }}>
              <img src="/aesthetic view 2.jpg" alt="Blockchain" style={{ width:'100%', height:440, objectFit:'cover', display:'block' }} />
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(3,10,18,0.55) 0%, transparent 55%, rgba(3,10,18,0.55) 100%)' }} />
              <HexCorner top={10} left={10} color="rgba(99,102,241,0.55)" />
              <HexCorner top={10} right={10} color="rgba(99,102,241,0.55)" />
              <HexCorner bottom={10} left={10} color="rgba(99,102,241,0.55)" />
              <HexCorner bottom={10} right={10} color="rgba(99,102,241,0.55)" />
              {/* scan line */}
              <motion.div style={{ position:'absolute', left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(99,102,241,0.5),transparent)' }}
                animate={{ top:['0%','100%'] }} transition={{ duration:4, repeat:Infinity, ease:'linear', repeatDelay:1.5 }} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SEKOLAH PRIORITAS ────────────────────────────────────────────── */}
      <section ref={tableRef} style={{ ...GRID_BG, background: BG, padding:'80px 28px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <motion.div initial={{ opacity:0, y:28 }} animate={tableInView ? { opacity:1, y:0 } : {}} transition={{ duration:0.7 }}>
            <SectionLabel>Priority Registry // Schools</SectionLabel>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:28 }}>
              <h2 style={{ fontSize:'clamp(1.6rem,3.5vw,2.2rem)', fontWeight:750, color: HI, letterSpacing:'-0.02em', margin:0 }}>
                Sekolah Prioritas Teratas
              </h2>
              <span style={{ fontFamily:'monospace', fontSize:11, color:'rgba(56,189,248,0.4)' }}>SHOWING 6 OF 1,284 RECORDS</span>
            </div>

            <PanelCard>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid rgba(56,189,248,0.08)', background:'rgba(56,189,248,0.03)' }}>
                      {['#','Sekolah','Kota','Alokasi','Distribusi %','Status'].map(h => (
                        <th key={h} style={{ padding:'12px 18px', textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'rgba(56,189,248,0.55)', fontFamily:'monospace', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PRIORITY_SCHOOLS.map((s, i) => {
                      const isProses = s.statusColor === 'yellow';
                      const sc = isProses
                        ? { color: AMBER, bg:'rgba(251,191,36,0.07)', border:'rgba(251,191,36,0.2)' }
                        : { color: GREEN, bg:'rgba(52,211,153,0.07)', border:'rgba(52,211,153,0.2)' };
                      return (
                        <motion.tr key={i}
                          initial={{ opacity:0, y: shouldReduceMotion ? 0 : 8 }}
                          animate={tableInView ? { opacity:1, y:0 } : {}}
                          transition={{ delay: i * 0.07, duration:0.4, ease:[0.16,1,0.3,1] }}
                          style={{ borderBottom:'1px solid rgba(255,255,255,0.03)', transition:'background 0.15s', cursor:'default' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.025)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding:'13px 18px', fontFamily:'monospace', fontSize:11, color:'rgba(56,189,248,0.3)' }}>
                            {String(i+1).padStart(2,'0')}
                          </td>
                          <td style={{ padding:'13px 18px', fontSize:13, fontWeight:500, color: HI }}>{s.nama}</td>
                          <td style={{ padding:'13px 18px', fontSize:13, color: TEXT }}>{s.kota}</td>
                          <td style={{ padding:'13px 18px', fontSize:13, fontWeight:600, color: CYAN, fontVariantNumeric:'tabular-nums' }}>{s.anggaran}</td>
                          <td style={{ padding:'13px 18px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:80, height:3, borderRadius:2, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
                                <div style={{ width:`${s.pct}%`, height:'100%', background: s.pct > 80 ? GREEN : AMBER, borderRadius:2, boxShadow:`0 0 6px ${s.pct > 80 ? GREEN : AMBER}` }} />
                              </div>
                              <span style={{ fontSize:11, fontFamily:'monospace', color: s.pct > 80 ? GREEN : AMBER }}>{s.pct}%</span>
                            </div>
                          </td>
                          <td style={{ padding:'13px 18px' }}>
                            <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:4, background: sc.bg, border:`1px solid ${sc.border}`, color: sc.color, fontFamily:'monospace' }}>
                              {s.status.toUpperCase()}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </PanelCard>
          </motion.div>
        </div>
      </section>

      {/* ── ESCROW ───────────────────────────────────────────────────────── */}
      <section style={{ background: BG2, padding:'80px 28px 96px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>
          <SectionLabel>Escrow Ledger // On-Chain Transparency</SectionLabel>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', flexWrap:'wrap', gap:12 }}>
            <h2 style={{ fontSize:'clamp(1.6rem,3.5vw,2.2rem)', fontWeight:750, color: HI, letterSpacing:'-0.02em', margin:0 }}>
              Transparansi Escrow Blockchain
            </h2>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'monospace', fontSize:11, color:'rgba(56,189,248,0.4)' }}>
              <Activity size={12} style={{ color: CYAN }} />
              LAST UPDATED: {clock} WIB
            </div>
          </div>

          {/* stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }} className="grid grid-cols-1 md:grid-cols-3">
            {[
              { label:'Total Terkunci', val: STATS.totalTerkunci, icon: Lock,         c: CYAN,  sub:'3 active contracts' },
              { label:'Total Tercair',  val: STATS.totalTercair,  icon: CheckCircle,  c: GREEN, sub:'Disbursed to schools' },
              { label:'Pending Release',val: STATS.pendingRelease,icon: Clock,        c: AMBER, sub:'Awaiting conditions' },
            ].map(({ label, val, icon: Icon, c, sub }) => (
              <PanelCard key={label} style={{ padding:'20px 22px', transition:'border-color 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e:any) => { e.currentTarget.style.borderColor=`${c}28`; e.currentTarget.style.boxShadow=`0 0 28px ${c}0a`; }}
                onMouseLeave={(e:any) => { e.currentTarget.style.borderColor='rgba(56,189,248,0.1)'; e.currentTarget.style.boxShadow='none'; }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:10, fontFamily:'monospace', color:`${c}70`, letterSpacing:'0.1em', marginBottom:8 }}>{label.toUpperCase()}</div>
                    <div style={{ fontSize:'1.3rem', fontWeight:700, color: HI, fontVariantNumeric:'tabular-nums', marginBottom:4 }}>{fmt(val)}</div>
                    <div style={{ fontSize:10, color: TEXT, fontFamily:'monospace' }}>{sub}</div>
                  </div>
                  <div style={{ width:38, height:38, borderRadius:8, background:`${c}0c`, border:`1px solid ${c}1e`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon size={18} style={{ color: c }} />
                  </div>
                </div>
              </PanelCard>
            ))}
          </div>

          {/* filter bar */}
          <PanelCard style={{ padding:'14px 18px', display:'flex', flexDirection:'row', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ flex:1, minWidth:200, position:'relative' }}>
              <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color: TEXT }} />
              <input type="text" placeholder="Search school, catering, tx hash..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ width:'100%', boxSizing:'border-box', paddingLeft:32, paddingRight:12, paddingTop:8, paddingBottom:8,
                  borderRadius:6, border:'1px solid rgba(56,189,248,0.1)', background:'rgba(255,255,255,0.03)',
                  color: HI, fontSize:12, fontFamily:'monospace', outline:'none', transition:'border-color 0.2s' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(56,189,248,0.3)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(56,189,248,0.1)')} />
            </div>
            <div style={{ position:'relative' }}>
              <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}
                style={{ paddingLeft:12, paddingRight:28, paddingTop:8, paddingBottom:8,
                  borderRadius:6, border:'1px solid rgba(56,189,248,0.1)', background: BG2,
                  color: HI, fontSize:12, fontFamily:'monospace', outline:'none', appearance:'none', minWidth:150,
                  transition:'border-color 0.2s', cursor:'pointer' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(56,189,248,0.3)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(56,189,248,0.1)')}>
                {['','Terkunci','Menunggu Rilis','Tercairkan','Tertunda'].map(v => (
                  <option key={v} value={v} style={{ background: BG2 }}>{v || 'All Status'}</option>
                ))}
              </select>
              <ChevronRight size={12} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%) rotate(90deg)', color: TEXT, pointerEvents:'none' }} />
            </div>
            <div style={{ fontSize:11, fontFamily:'monospace', color:'rgba(56,189,248,0.4)', whiteSpace:'nowrap' }}>
              {filtered.length} RECORDS FOUND
            </div>
          </PanelCard>

          {/* table */}
          <PanelCard>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid rgba(56,189,248,0.08)', background:'rgba(56,189,248,0.03)' }}>
                    {['TX ID','Sekolah','Katering','Jumlah','Status','Block','Tanggal','Hash'].map(h => (
                      <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:10, fontWeight:700,
                        letterSpacing:'0.1em', color:'rgba(56,189,248,0.5)', fontFamily:'monospace',
                        textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((e, i) => {
                    const ss = STATUS_STYLE[e.status] ?? STATUS_STYLE['Terkunci'];
                    return (
                      <motion.tr key={e.id}
                        initial={{ opacity:0, y: shouldReduceMotion ? 0 : 6 }}
                        animate={{ opacity:1, y:0 }}
                        transition={{ delay: i * 0.035, duration:0.35, ease:[0.16,1,0.3,1] }}
                        style={{ borderBottom:'1px solid rgba(255,255,255,0.03)', transition:'background 0.12s', cursor:'default' }}
                        onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(56,189,248,0.025)')}
                        onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ fontFamily:'monospace', fontSize:11, color:'rgba(56,189,248,0.45)' }}>#{e.id}</span>
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:28, height:28, borderRadius:6, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(56,189,248,0.07)', border:'1px solid rgba(56,189,248,0.15)' }}>
                              <Shield size={12} style={{ color: CYAN }} />
                            </div>
                            <span style={{ fontSize:12, fontWeight:500, color: HI }}>{e.school}</span>
                          </div>
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:12, color: TEXT }}>{e.catering}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, fontWeight:600, color: CYAN, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{fmt(e.amount)}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <div style={{ width:5, height:5, borderRadius:'50%', background: ss.dot, boxShadow:`0 0 5px ${ss.dot}`, flexShrink:0 }} />
                            <span style={{ fontSize:11, fontWeight:600, fontFamily:'monospace', color: ss.color, whiteSpace:'nowrap' }}>{e.status.toUpperCase()}</span>
                          </div>
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ fontSize:11, fontFamily:'monospace', color:'rgba(56,189,248,0.4)' }}>#{e.block.toLocaleString()}</span>
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:11, fontFamily:'monospace', color: TEXT, whiteSpace:'nowrap' }}>
                          {new Date(e.lockedAt).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          <a href={`https://sepolia.etherscan.io/tx/${e.txHash}`} target="_blank" rel="noopener noreferrer"
                            style={{ fontFamily:'monospace', fontSize:11, color:'#818cf8', textDecoration:'none', display:'flex', alignItems:'center', gap:4, transition:'color 0.15s' }}
                            onMouseEnter={ev => (ev.currentTarget.style.color = '#a5b4fc')}
                            onMouseLeave={ev => (ev.currentTarget.style.color = '#818cf8')}>
                            {e.txHash.slice(0,10)}…
                            <ExternalLink size={10} />
                          </a>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* pagination */}
            <div style={{ padding:'12px 18px', borderTop:'1px solid rgba(56,189,248,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
              <span style={{ fontFamily:'monospace', fontSize:11, color:'rgba(56,189,248,0.4)' }}>
                {filtered.length === 0 ? 'NO RECORDS' : `SHOWING ${(page-1)*PER_PAGE+1}–${Math.min(page*PER_PAGE,filtered.length)} OF ${filtered.length}`}
              </span>
              <div style={{ display:'flex', gap:6 }}>
                {[{l:'← PREV', fn:()=>setPage(p=>Math.max(1,p-1)), d:page===1},
                  {l:'NEXT →', fn:()=>setPage(p=>Math.min(totalPages,p+1)), d:page===totalPages||totalPages===0}].map(({l,fn,d})=>(
                  <button key={l} onClick={fn} disabled={d}
                    style={{ padding:'6px 14px', borderRadius:5, fontSize:11, fontFamily:'monospace', fontWeight:600,
                      background:'rgba(56,189,248,0.05)', border:'1px solid rgba(56,189,248,0.12)',
                      color: d ? 'rgba(56,189,248,0.2)' : 'rgba(56,189,248,0.6)', cursor: d?'not-allowed':'pointer',
                      transition:'all 0.15s', letterSpacing:'0.05em' }}
                    onMouseEnter={e=>{if(!d){(e.currentTarget).style.borderColor='rgba(56,189,248,0.3)';(e.currentTarget).style.color=CYAN;}}}
                    onMouseLeave={e=>{(e.currentTarget).style.borderColor='rgba(56,189,248,0.12)';(e.currentTarget).style.color=d?'rgba(56,189,248,0.2)':'rgba(56,189,248,0.6)';}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </PanelCard>

          {/* info banner */}
          <div style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'14px 18px', borderRadius:8, background:'rgba(56,189,248,0.03)', border:'1px solid rgba(56,189,248,0.09)' }}>
            <AlertCircle size={14} style={{ color: CYAN, flexShrink:0, marginTop:2 }} />
            <div>
              <span style={{ fontSize:12, fontWeight:600, color: CYAN, fontFamily:'monospace' }}>SMART CONTRACT INFO // </span>
              <span style={{ fontSize:12, color: TEXT, fontFamily:'monospace' }}>
                Semua transaksi dikelola melalui smart contract di Ethereum Sepolia. Dana tercairkan otomatis saat kondisi terpenuhi atau di-release manual oleh admin. Contract address: 0x742d35Cc6634C0532925a3b8D4C9B0E1f2A3B4D5
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ background:'#020609', borderTop:'1px solid rgba(56,189,248,0.06)', padding:'52px 28px 36px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 1fr', gap:48, marginBottom:40 }}
            className="grid grid-cols-1 md:grid-cols-4">
            <div>
              <Image src="/MBG-removebg-preview.png" alt="MBG Logo" width={108} height={36}
                className="object-contain" style={{ height:'auto', filter:'brightness(0) invert(1)', opacity:0.55 }} />
              <p style={{ fontSize:12, color:'#1e3a4a', marginTop:14, lineHeight:1.8, fontFamily:'monospace' }}>
                Platform transparansi blockchain untuk<br />Program Makan Bergizi Gratis.
              </p>
              <div style={{ display:'flex', gap:8, marginTop:14 }}>
                <div style={{ padding:'4px 10px', border:'1px solid rgba(56,189,248,0.12)', borderRadius:4, fontSize:10, fontFamily:'monospace', color:'rgba(56,189,248,0.35)' }}>ETH:SEPOLIA</div>
                <div style={{ padding:'4px 10px', border:'1px solid rgba(52,211,153,0.12)', borderRadius:4, fontSize:10, fontFamily:'monospace', color:'rgba(52,211,153,0.35)' }}>AUDITED</div>
              </div>
              <p style={{ fontSize:11, color:'#1e2d35', marginTop:14, fontFamily:'monospace' }}>© 2025 MBG. ALL RIGHTS RESERVED.</p>
            </div>
            {[
              { title:'PERUSAHAAN', links:['Tentang Kami','Karir','Tim'] },
              { title:'SUMBER DAYA', links:['FAQ','Blog'] },
              { title:'HUKUM', links:['Kebijakan Privasi','Syarat Layanan'] },
            ].map(({ title, links }) => (
              <div key={title}>
                <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:'rgba(56,189,248,0.35)', fontFamily:'monospace', marginBottom:14, marginTop:0 }}>{title}</p>
                <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:10 }}>
                  {links.map(l => (
                    <li key={l}>
                      <a href="#" style={{ fontSize:12, color:'#1e3a4a', textDecoration:'none', fontFamily:'monospace', transition:'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#334f5c')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#1e3a4a')}>
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.03)', paddingTop:20, textAlign:'center' }}>
            <p style={{ fontSize:11, color:'#0f1e26', margin:0, fontFamily:'monospace' }}>MADE WITH LOVE IN INDONESIA</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
