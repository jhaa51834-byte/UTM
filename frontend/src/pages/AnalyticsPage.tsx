import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { api } from "../lib/api";

const COLORS = ["#8b5cf6", "#06b6d4", "#ec4899", "#f59e0b", "#10b981", "#6366f1", "#f472b6", "#34d399"];

export default function AnalyticsPage() {
  const [tab, setTab] = useState<"overview" | "geo" | "devices" | "campaigns" | "sources">("overview");
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
        // Demo data
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
    { id: "overview", label: "Overview" },
    { id: "geo", label: "Geography" },
    { id: "devices", label: "Devices" },
    { id: "campaigns", label: "Campaigns" },
  ] as const;

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-zinc-500">Deep-dive into campaign performance</p>
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

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-white/[0.03] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-4 py-2 text-xs font-medium transition-all ${
              tab === t.id
                ? "bg-violet-500/20 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="glass rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-300">Click Trends</h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={timeseries}>
                <defs>
                  <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gUnique" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="timestamp" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1e1e28", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="total_clicks" stroke="#8b5cf6" strokeWidth={2} fill="url(#gTotal)" name="Total" />
                <Area type="monotone" dataKey="unique_clicks" stroke="#06b6d4" strokeWidth={2} fill="url(#gUnique)" name="Unique" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "geo" && (
        <div className="glass rounded-xl p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-300">Geographic Breakdown</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={geo.countries?.slice(0, 10)} layout="vertical">
                  <XAxis type="number" axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="country" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1e1e28", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="clicks" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {geo.countries?.map((c: any) => (
                <div key={c.country_code} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{c.country_code}</span>
                    <span className="text-xs text-zinc-300">{c.country}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-200">{c.clicks.toLocaleString()}</span>
                    <span className="text-xs text-zinc-500">{c.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "devices" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Devices */}
          <div className="glass rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-300">Device Types</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={devices.devices} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="clicks" nameKey="device_type" strokeWidth={0}>
                  {devices.devices?.map((_: any, i: number) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1e1e28", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1.5">
              {devices.devices?.map((d: any, i: number) => (
                <div key={d.device_type} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-zinc-400">{d.device_type}</span>
                  </div>
                  <span className="font-medium text-zinc-200">{d.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Browsers */}
          <div className="glass rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-300">Browsers</h3>
            <div className="space-y-3">
              {devices.browsers?.map((b: any, i: number) => (
                <div key={b.browser}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{b.browser}</span>
                    <span className="font-medium text-zinc-200">{b.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full" style={{ width: `${b.percentage}%`, background: COLORS[i] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OS */}
          <div className="glass rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-300">Operating Systems</h3>
            <div className="space-y-3">
              {devices.operating_systems?.map((o: any, i: number) => (
                <div key={o.os}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{o.os}</span>
                    <span className="font-medium text-zinc-200">{o.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full" style={{ width: `${o.percentage}%`, background: COLORS[i + 3] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "campaigns" && (
        <div className="glass overflow-hidden rounded-xl">
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
                    <span className="text-sm font-medium text-zinc-200">{c.campaign_name}</span>
                  </td>
                  <td className="font-mono text-sm text-zinc-200">{c.total_clicks?.toLocaleString()}</td>
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
