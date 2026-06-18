import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { api } from "../lib/api";
import { TrendingUp, Globe, Monitor, Megaphone } from "lucide-react";

const COLORS = ["#8b5cf6", "#22d3ee", "#f472b6", "#fbbf24", "#34d399", "#818cf8", "#f472b6", "#34d399"];

const tooltipStyle = {
  background: "rgba(17, 17, 25, 0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  fontSize: "12px",
  color: "#f4f4f5",
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
};

export default function AnalyticsPage() {
  const [tab, setTab] = useState<"overview" | "geo" | "devices" | "campaigns">("overview");
  const [timeseries, setTimeseries] = useState<any[]>([]);
  const [geo, setGeo] = useState<any>({ countries: [] });
  const [devices, setDevices] = useState<any>({ devices: [], browsers: [], operating_systems: [] });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [granularity, setGranularity] = useState("day");
  const [dateRange, setDateRange] = useState("30d");

  useEffect(() => {
    const load = async () => {
      try {
        const [ts, g, d, c] = await Promise.all([
          api.analyticsClicks({ granularity }),
          api.analyticsGeo(),
          api.analyticsDevices(),
          api.analyticsCampaigns(),
        ]);
        setTimeseries(ts);
        setGeo(g);
        setDevices(d);
        setCampaigns(c);
      } catch {
        setTimeseries(
          Array.from({ length: 30 }, (_, i) => ({
            timestamp: `2026-06-${String(i + 1).padStart(2, "0")}`,
            total_clicks: Math.floor(Math.random() * 600 + 150),
            unique_clicks: Math.floor(Math.random() * 400 + 80),
          }))
        );
        setGeo({
          countries: [
            { country: "United States", country_code: "US", clicks: 4521, percentage: 35.2 },
            { country: "India", country_code: "IN", clicks: 3245, percentage: 25.3 },
            { country: "United Kingdom", country_code: "GB", clicks: 1832, percentage: 14.3 },
            { country: "Germany", country_code: "DE", clicks: 1205, percentage: 9.4 },
            { country: "Canada", country_code: "CA", clicks: 982, percentage: 7.7 },
            { country: "Australia", country_code: "AU", clicks: 651, percentage: 5.1 },
          ],
        });
        setDevices({
          devices: [
            { device_type: "Desktop", clicks: 5842, percentage: 58.4 },
            { device_type: "Mobile", clicks: 3215, percentage: 32.2 },
            { device_type: "Tablet", clicks: 943, percentage: 9.4 },
          ],
          browsers: [
            { browser: "Chrome", clicks: 4523, percentage: 45.2 },
            { browser: "Safari", clicks: 2341, percentage: 23.4 },
            { browser: "Firefox", clicks: 1205, percentage: 12.1 },
            { browser: "Edge", clicks: 982, percentage: 9.8 },
          ],
          operating_systems: [
            { os: "Windows", clicks: 3821, percentage: 38.2 },
            { os: "macOS", clicks: 2534, percentage: 25.3 },
            { os: "iOS", clicks: 1823, percentage: 18.2 },
            { os: "Android", clicks: 1482, percentage: 14.8 },
          ],
        });
        setCampaigns([
          { campaign_name: "summer_sale_2026", total_clicks: 3421, unique_clicks: 2105, link_count: 12 },
          { campaign_name: "webinar_q3_launch", total_clicks: 1902, unique_clicks: 1304, link_count: 8 },
          { campaign_name: "newsletter_weekly", total_clicks: 1456, unique_clicks: 987, link_count: 24 },
        ]);
      }
    };
    load();
  }, [granularity, dateRange]);

  const TABS = [
    { id: "overview" as const, label: "Overview", icon: TrendingUp },
    { id: "geo" as const, label: "Geography", icon: Globe },
    { id: "devices" as const, label: "Devices", icon: Monitor },
    { id: "campaigns" as const, label: "Campaigns", icon: Megaphone },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex items-center justify-between">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Deep-dive into campaign performance</p>
        </div>
        <div className="flex gap-2">
          <select value={granularity} onChange={(e) => setGranularity(e.target.value)} className="input-field w-auto text-xs">
            <option value="hour">Hourly</option>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="input-field w-auto text-xs">
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
          </select>
        </div>
      </div>

      {/* Tabs with animated indicator */}
      <div className="animate-fade-up flex gap-1 rounded-xl bg-white/[0.025] p-1 border border-white/[0.04]" style={{ animationDelay: '0.1s' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-medium transition-all duration-300 ${
              tab === t.id
                ? "bg-gradient-to-r from-violet-500/15 to-fuchsia-500/5 text-white shadow-sm border border-violet-500/15"
                : "text-zinc-500 hover:text-zinc-300 border border-transparent"
            }`}
          >
            <t.icon className={`h-3.5 w-3.5 ${tab === t.id ? "text-violet-400" : ""}`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="space-y-6 animate-fade-up">
          <div className="glass rounded-2xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                <TrendingUp className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>Click Trends</h3>
                <p className="text-[11px] text-zinc-600">Total vs unique clicks over time</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={timeseries}>
                <defs>
                  <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gUnique" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="timestamp" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="total_clicks" stroke="#8b5cf6" strokeWidth={2} fill="url(#gTotal)" name="Total" />
                <Area type="monotone" dataKey="unique_clicks" stroke="#22d3ee" strokeWidth={2} fill="url(#gUnique)" name="Unique" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "geo" && (
        <div className="glass rounded-2xl p-6 animate-fade-up">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10">
              <Globe className="h-4 w-4 text-cyan-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>Geographic Breakdown</h3>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={geo.countries?.slice(0, 10)} layout="vertical">
                  <XAxis type="number" axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="country" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="clicks" fill="#8b5cf6" radius={[0, 8, 8, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {geo.countries?.map((c: any, i: number) => (
                <div key={c.country_code} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3 border border-white/[0.03] transition-colors hover:bg-white/[0.04] animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-500 w-6">{c.country_code}</span>
                    <span className="text-sm text-zinc-300">{c.country}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-semibold text-zinc-200">{c.clicks.toLocaleString()}</span>
                    <span className="badge badge-brand text-[10px]">{c.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "devices" && (
        <div className="grid gap-4 lg:grid-cols-3 animate-fade-up">
          {/* Devices */}
          <div className="glass rounded-2xl p-6 hover-lift">
            <h3 className="mb-5 text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>Device Types</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={devices.devices} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="clicks" nameKey="device_type" strokeWidth={0}>
                  {devices.devices?.map((_: any, i: number) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {devices.devices?.map((d: any, i: number) => (
                <div key={d.device_type} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-zinc-400">{d.device_type}</span>
                  </div>
                  <span className="font-semibold text-zinc-200">{d.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Browsers */}
          <div className="glass rounded-2xl p-6 hover-lift">
            <h3 className="mb-5 text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>Browsers</h3>
            <div className="space-y-4">
              {devices.browsers?.map((b: any, i: number) => (
                <div key={b.browser}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{b.browser}</span>
                    <span className="font-semibold text-zinc-200">{b.percentage}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${b.percentage}%`, background: `linear-gradient(90deg, ${COLORS[i]}, ${COLORS[i]}88)`, boxShadow: `0 0 8px ${COLORS[i]}40` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OS */}
          <div className="glass rounded-2xl p-6 hover-lift">
            <h3 className="mb-5 text-sm font-semibold text-zinc-200" style={{ fontFamily: 'var(--font-display)' }}>Operating Systems</h3>
            <div className="space-y-4">
              {devices.operating_systems?.map((o: any, i: number) => (
                <div key={o.os}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{o.os}</span>
                    <span className="font-semibold text-zinc-200">{o.percentage}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${o.percentage}%`, background: `linear-gradient(90deg, ${COLORS[i + 3]}, ${COLORS[i + 3]}88)`, boxShadow: `0 0 8px ${COLORS[i + 3]}40` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "campaigns" && (
        <div className="glass overflow-hidden rounded-2xl animate-fade-up">
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Total Clicks</th>
                <th>Unique Clicks</th>
                <th>Links</th>
                <th>CTR</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c: any) => (
                <tr key={c.campaign_name}>
                  <td>
                    <span className="text-sm font-semibold text-zinc-200">{c.campaign_name}</span>
                  </td>
                  <td className="font-mono text-sm font-semibold text-zinc-200">{c.total_clicks?.toLocaleString()}</td>
                  <td className="font-mono text-sm text-zinc-400">{c.unique_clicks?.toLocaleString()}</td>
                  <td className="text-sm text-zinc-400">{c.link_count}</td>
                  <td>
                    <span className="badge badge-brand">
                      {c.unique_clicks && c.total_clicks
                        ? `${((c.unique_clicks / c.total_clicks) * 100).toFixed(1)}%`
                        : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
