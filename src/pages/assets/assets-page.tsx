import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus } from "lucide-react";
import { api } from "@/shared/api/client";

const STATUS_LABEL: Record<string, string> = {
  in_stock: "In stock",
  assigned: "Assigned",
  in_repair: "In repair",
  retired: "Retired",
  lost: "Lost",
};

const STATUS_CLASS: Record<string, string> = {
  in_stock: "bg-blue-50 text-blue-700",
  assigned: "bg-green-50 text-green-700",
  in_repair: "bg-amber-50 text-amber-700",
  retired: "bg-zinc-100 text-zinc-500",
  lost: "bg-red-50 text-red-700",
};

function useAssets(search: string) {
  return useQuery({
    queryKey: ["assets", "list", search],
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/assets", {
        params: { query: { search: search || undefined, limit: 50 } },
      });
      if (error || !data) throw new Error("Failed to load assets");
      return data;
    },
  });
}

export function AssetsPage() {
  const [search, setSearch] = useState("");
  const assets = useAssets(search);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Assets</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Hardware inventory and lifecycle tracking.</p>
        </div>
        <button
          disabled
          title="Coming soon"
          className="flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add asset
        </button>
      </div>

      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" strokeWidth={1.75} />
        <input
          type="text"
          placeholder="Search tag or model..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Tag</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Type</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Model</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Assigned to</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {assets.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">
                  Loading...
                </td>
              </tr>
            )}
            {assets.isError && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-red-500">
                  Failed to load assets. Is the API running?
                </td>
              </tr>
            )}
            {assets.data?.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm text-zinc-400">No assets found</span>
                    <span className="text-xs text-zinc-300">Add your first asset to get started</span>
                  </div>
                </td>
              </tr>
            )}
            {assets.data?.data.map((a) => (
              <tr key={a.id} className="transition-colors hover:bg-zinc-50">
                <td className="px-4 py-3 font-mono text-xs font-medium text-zinc-800">{a.assetTag}</td>
                <td className="px-4 py-3 text-zinc-600 capitalize">{a.type}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {[a.manufacturer, a.model].filter(Boolean).join(" ") || (
                    <span className="text-zinc-300">No model</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={[
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                      STATUS_CLASS[a.status] ?? "bg-zinc-100 text-zinc-500",
                    ].join(" ")}
                  >
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {a.assignedTo ? (
                    <span className="text-zinc-800">{String(a.assignedTo)}</span>
                  ) : (
                    <span className="text-zinc-300">Unassigned</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {assets.data && (
          <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-400">
            {assets.data.pageInfo.total} asset{assets.data.pageInfo.total !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
