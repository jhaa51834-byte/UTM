import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { api } from "../lib/api";

const COLORS = ["#8b5cf6", "#06b6d4", "#ec4899", "#f59e0b", "#10b981", "#6366f1"];

// Placeholder data for when API isn't connected
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

export default function DashboardPage() {
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
        // Use demo data if API not connected
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

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500">Real-time campaign performance overview</p>
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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Total Clicks"
          value={stats.total_clicks.toLocaleString()}
          change={stats.clicks_change_pct}
          gradient="from-violet-500 to-fuchsia-500"
        />
        <StatCard
          label="Unique Clicks"
          value={stats.unique_clicks.toLocaleString()}
          gradient="from-cyan-500 to-blue-500"
        />
        <StatCard
          label="Active Links"
          value={stats.active_links.toLocaleString()}
          gradient="from-emerald-500 to-teal-500"
        />
        <StatCard
          label="Campaigns"
          value={stats.total_campaigns.toLocaleString()}
          gradient="from-amber-500 to-orange-500"
        />
        <StatCard
          label="QR Scans"
          value={stats.qr_scans.toLocaleString()}
          gradient="from-pink-500 to-rose-500"
        />
      </div>

      {/* Click Timeseries Chart */}
      <div className="glass rounded-xl p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">Click Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={timeseries}>
            <defs>
              <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="timestamp" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "#1e1e28",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#f4f4f5",
              }}
            />
            <Area
              type="monotone"
              dataKey="total_clicks"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#colorClicks)"
              name="Total"
            />
            <Area
              type="monotone"
              dataKey="unique_clicks"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#colorUnique)"
              name="Unique"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Device Breakdown */}
        <div className="glass rounded-xl p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-300">Devices</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={devices}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
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
                  background: "#1e1e28",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {devices.map((d, i) => (
              <div key={d.device_type} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-zinc-400">{d.device_type}</span>
                </div>
                <span className="font-medium text-zinc-200">{d.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Browser Breakdown */}
        <div className="glass rounded-xl p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-300">Browsers</h3>
          <div className="space-y-3">
            {browsers.map((b, i) => (
              <div key={b.browser}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{b.browser}</span>
                  <span className="font-medium text-zinc-200">
                    {b.clicks.toLocaleString()} ({b.percentage}%)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${b.percentage}%`,
                      background: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Campaigns */}
        <div className="glass rounded-xl p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-300">Top Campaigns</h3>
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
                  background: "#1e1e28",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="total_clicks" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
  gradient,
}: {
  label: string;
  value: string;
  change?: number;
  gradient: string;
}) {
  return (
    <div className="stat-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        {change !== undefined && (
          <span
            className={`text-xs font-bold ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}
          >
            {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <div className={`mt-3 h-1 w-full rounded-full bg-gradient-to-r ${gradient} opacity-60`} />
    </div>
  );
}
