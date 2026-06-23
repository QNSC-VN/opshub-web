import { useQuery } from "@tanstack/react-query";
import { Laptop, ShieldCheck, ScanLine, CalendarClock, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { api } from "@/shared/api/client";

function useAssetCount() {
  return useQuery({
    queryKey: ["assets", "count"],
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/assets", {
        params: { query: { limit: 1 } },
      });
      if (error || !data) throw new Error("Failed to load assets");
      return data.pageInfo.total;
    },
  });
}

interface StatTileProps {
  label: string;
  value: string | number | undefined;
  loading?: boolean;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  color: string;
  to: string;
}

function StatTile({ label, value, loading, icon: Icon, color, to }: StatTileProps) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: color + "15" }}
        >
          <Icon className="h-4.5 w-4.5" strokeWidth={1.75} style={{ color }} />
        </div>
        <ArrowRight
          className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-zinc-500"
          strokeWidth={1.75}
        />
      </div>
      <div>
        <div className="tabular-nums text-2xl font-semibold tracking-tight text-zinc-900">
          {loading ? (
            <span className="inline-block h-7 w-8 animate-pulse rounded bg-zinc-100" />
          ) : (
            value ?? "—"
          )}
        </div>
        <div className="mt-0.5 text-sm text-zinc-500">{label}</div>
      </div>
    </Link>
  );
}

const TILES = [
  {
    key: "assets",
    label: "Hardware assets",
    icon: Laptop,
    color: "#2563eb",
    to: "/assets",
  },
  {
    key: "access",
    label: "Pending access requests",
    icon: ShieldCheck,
    color: "#d97706",
    to: "/access",
  },
  {
    key: "findings",
    label: "Compliance findings",
    icon: ScanLine,
    color: "#dc2626",
    to: "/compliance",
  },
  {
    key: "leave",
    label: "Leave requests",
    icon: CalendarClock,
    color: "#7c3aed",
    to: "/workforce",
  },
] as const;

export function DashboardPage() {
  const assetCount = useAssetCount();

  return (
    <div className="flex flex-col gap-7">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Overview</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Operations summary across IT and HR domains.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          API connected
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map(({ key, label, icon, color, to }) => (
          <StatTile
            key={key}
            label={label}
            icon={icon}
            color={color}
            to={to}
            loading={key === "assets" ? assetCount.isLoading : false}
            value={key === "assets" ? assetCount.data : undefined}
          />
        ))}
      </div>

      {/* Domain overview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* IT Ops */}
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
              <span className="text-sm font-medium text-zinc-800">IT Operations</span>
            </div>
          </div>
          <div className="divide-y divide-zinc-50">
            {[
              { label: "Assets", sub: "Hardware inventory", to: "/assets", icon: Laptop, color: "#2563eb" },
              { label: "Access Requests", sub: "Temp admin and privileged access", to: "/access", icon: ShieldCheck, color: "#d97706" },
              { label: "Compliance", sub: "Endpoint findings and drift", to: "/compliance", icon: ScanLine, color: "#dc2626" },
            ].map(({ label, sub, to, icon: Icon, color }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-zinc-50"
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{ background: color + "12" }}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-zinc-800">{label}</div>
                  <div className="text-xs text-zinc-400">{sub}</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500" strokeWidth={1.75} />
              </Link>
            ))}
          </div>
        </div>

        {/* HR Ops */}
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
              <span className="text-sm font-medium text-zinc-800">Workforce</span>
            </div>
          </div>
          <div className="divide-y divide-zinc-50">
            {[
              { label: "Timesheets", sub: "Hours worked and overtime", to: "/workforce" },
              { label: "Leave", sub: "Annual, sick and unpaid leave", to: "/workforce" },
              { label: "Shift management", sub: "Night shifts and on-call rosters", to: "/workforce" },
            ].map(({ label, sub, to }) => (
              <Link
                key={label}
                to={to}
                className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-zinc-50"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-50">
                  <CalendarClock className="h-3.5 w-3.5 text-violet-600" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-zinc-800">{label}</div>
                  <div className="text-xs text-zinc-400">{sub}</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500" strokeWidth={1.75} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
