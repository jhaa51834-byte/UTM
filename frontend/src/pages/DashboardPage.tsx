import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { MousePointerClick, Users, Link2, Megaphone, QrCode, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

const COLORS = ["#8b5cf6", "#22d3ee", "#f472b6", "#fbbf24", "#34d399", "#818cf8"];

const DEMO_TIMESERIES = Array.from({ length: 30 }, (_, i) => ({
  timestamp: `Day ${i + 1}`,
  total_clicks: Math.floor(Math.random() * 500 + 100),
  unique_clicks: Math.floor(Math.random() * 300 + 50),
}));

const DEMO_DEVICES = [
  { device_type: "Desktop", clicks: 5842, percentage: 58.4 },
  { device_type: "Mobile", clicks: 3215, percentage: 32.2 },
  { device_type: "Tablet", clicks: 943, percentage: 9.4 },
];

const DEMO_BROWSERS = [
  { browser: "Chrome", clicks: 4523, percentage: 45.2 },
  { browser: "Safari", clicks: 2341, percentage: 23.4 },
  { browser: "Firefox", clicks: 1205, percentage: 12.1 },
  { browser: "Edge", clicks: 982, percentage: 9.8 },
  { browser: "Other", clicks: 949, percentage: 9.5 },
];

const DEMO_CAMPAIGNS = [
  { campaign_name: "summer_sale_2026", total_clicks: 3421 },
  { campaign_name: "india_healthcare_leadgen", total_clicks: 2805 },
  { campaign_name: "webinar_q3_launch", total_clicks: 1902 },
  { campaign_name: "newsletter_weekly", total_clicks: 1456 },
  { campaign_name: "linkedin_brand_awareness", total_clicks: 1210 },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  const [timeseries, setTimeseries] = useState(DEMO_TIMESERIES);
  const [devices, setDevices] = useState(DEMO_DEVICES);
  const [browsers, setBrowsers] = useState(DEMO_BROWSERS);
  const [campaigns, setCampaigns] = useState(DEMO_CAMPAIGNS);
  const [dateRange, setDateRange] = useState("30d");

  useEffect(() => {
    const load = async () => {
      try {
        const [ov, ts, dev, camp] = await Promise.all([
          api.analyticsOverview(),
          api.analyticsClicks({ granularity: "day" }),
          api.analyticsDevices(),
          api.analyticsCampaigns(),
        ]);
        setOverview(ov);
        if (ts?.length) setTimeseries(ts);
        if (dev?.devices?.length) setDevices(dev.devices);
        if (dev?.browsers?.length) setBrowsers(dev.browsers);
        if (camp?.length) setCampaigns(camp);
      } catch {
        setOverview({
          total_clicks: 14231,
          unique_clicks: 8945,
          active_links: 342,
          total_campaigns: 28,
          qr_scans: 1205,
          clicks_change_pct: 23.5,
        });
      }
    };
    load();
  }, [dateRange]);

  const stats = overview || {
    total_clicks: 14231,
    unique_clicks: 8945,
    active_links: 342,
    total_campaigns: 28,
    qr_scans: 1205,
    clicks_change_pct: 23.5,
  };

  const firstName = (user?.full_name || "").split(" ")[0] || "there";

  const STAT_CARDS = [
    { label: "Total Clicks", value: stats.total_clicks, change: stats.clicks_change_pct, icon: MousePointerClick, accent: "#8b5cf6", gradient: "from-violet-500/20 to-violet-500/5" },
    { label: "Unique Clicks", value: stats.unique_clicks, icon: Users, accent: "#22d3ee", gradient: "from-cyan-500/20 to-cyan-500/5" },
    { label: "Active Links", value: stats.active_links, icon: Link2, accent: "#34d399", gradient: "from-emerald-500/20 to-emerald-500/5" },
    { label: "Campaigns", value: stats.total_campaigns, icon: Megaphone, accent: "#fbbf24", gradient: "from-amber-500/20 to-amber-500/5" },
    { label: "QR Scans", value: stats.qr_scans, icon: QrCode, accent: "#f472b6", gradient: "from-pink-500/20 to-pink-500/5" },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <div className="animate-fade-up rounded-2xl bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-cyan-500/10 border border-white/[0.06] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="page-title flex items-center gap-2">
              {getGreeting()}, {firstName} 👋
            </h1>
            <p className="page-subtitle mt-1 flex items-center gap-2">
              Real-time campaign performance overview
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/15">
                <span className="pulse-dot" style={{ width: 6, height: 6 }} />
                Live
              </span>
            </p>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input-field w-auto text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {STAT_CARDS.map((card, i) => (
          <div
            key={card.label}
            className={`stat-card p-4 animate-fade-up hover-lift`}
            style={{ '--stat-accent': card.accent, animationDelay: `${i * 0.06}s` } as any}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient}`}>
                <card.icon className="h-4 w-4" style={{ color: card.accent }} />
              </div>
              {card.change !== undefined && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-bold ${
                    card.change >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {card.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(card.change)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-white animate-count-up" style={{ fontFamily: 'var(--font-display)', animationDelay: `${i * 0.1 + 0.2}s` }}>
              {(card.value || 0).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Click Timeseries Chart */}
      <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: '0.3s' }}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
              <TrendingUp className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>Click Trends</h2>
              <p className="text-[11px] text-zinc-600">Total vs unique clicks over time</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              <span className="text-zinc-500">Total</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="text-zinc-500">Unique</span>
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={timeseries}>
            <defs>
              <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="timestamp" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "rgba(17, 17, 25, 0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                fontSize: "12px",
                color: "#f4f4f5",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                backdropFilter: "blur(20px)",
              }}
            />
            <Area type="monotone" dataKey="total_clicks" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorClicks)" name="Total" />
            <Area type="monotone" dataKey="unique_clicks" stroke="#22d3ee" strokeWidth={2} fill="url(#colorUnique)" name="Unique" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Device Breakdown */}
        <div className="glass rounded-2xl p-6 animate-fade-up hover-lift" style={{ animationDelay: '0.4s' }}>
          <h3 className="mb-5 text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>Devices</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={devices}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="clicks"
                nameKey="device_type"
                strokeWidth={0}
              >
                {devices.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgba(17, 17, 25, 0.95)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {devices.map((d, i) => (
              <div key={d.device_type} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-zinc-400">{d.device_type}</span>
                </div>
                <span className="font-semibold text-zinc-200">{d.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Browser Breakdown */}
        <div className="glass rounded-2xl p-6 animate-fade-up hover-lift" style={{ animationDelay: '0.5s' }}>
          <h3 className="mb-5 text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>Browsers</h3>
          <div className="space-y-4">
            {browsers.map((b, i) => (
              <div key={b.browser}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{b.browser}</span>
                  <span className="font-semibold text-zinc-200">
                    {b.clicks.toLocaleString()} <span className="text-zinc-600">({b.percentage}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${b.percentage}%`,
                      background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[i % COLORS.length]}88)`,
                      boxShadow: `0 0 8px ${COLORS[i % COLORS.length]}40`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Campaigns */}
        <div className="glass rounded-2xl p-6 animate-fade-up hover-lift" style={{ animationDelay: '0.6s' }}>
          <h3 className="mb-5 text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>Top Campaigns</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={campaigns} layout="vertical">
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="campaign_name"
                width={150}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(17, 17, 25, 0.95)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              />
              <Bar dataKey="total_clicks" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
