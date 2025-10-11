import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ValidationList {
  id: string;
  name: string;
  total_emails: number;
  deliverable_count: number;
  undeliverable_count: number;
  risky_count: number;
  unknown_count: number;
  created_at: string;
}

interface ValidationResult {
  id: string;
  email: string;
  result: string;
  format_valid: boolean;
  domain_valid: boolean;
  smtp_valid: boolean;
  catch_all: boolean;
  disposable: boolean;
  free_email: boolean;
  reason: string | null;
  deliverable: boolean;
}

const COLORS = {
  deliverable: {
    start: "#10b981",
    end: "#06d6a0",
    glow: "rgba(16, 185, 129, 0.5)",
  },
  undeliverable: {
    start: "#ef4444",
    end: "#f72585",
    glow: "rgba(247, 37, 133, 0.5)",
  },
  risky: {
    start: "#f59e0b",
    end: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.5)",
  },
  unknown: {
    start: "#6366f1",
    end: "#8b5cf6",
    glow: "rgba(139, 92, 246, 0.5)",
  },
};

const ValidationResults = () => {
  const { listId } = useParams();
  const [list, setList] = useState<ValidationList | null>(null);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (listId) {
      loadData();
    }
  }, [listId]);

  const loadData = async () => {
    setLoading(true);
    
    // Load list info
    const { data: listData } = await supabase
      .from("validation_lists")
      .select("*")
      .eq("id", listId)
      .single();

    if (listData) {
      setList(listData);
    }

    // Load results
    const { data: resultsData } = await supabase
      .from("validation_results")
      .select("*")
      .eq("validation_list_id", listId);

    if (resultsData) {
      setResults(resultsData);
    }

    setLoading(false);
  };

  const exportResults = (onlyValid: boolean) => {
    const dataToExport = onlyValid
      ? results.filter((r) => r.deliverable)
      : results;

    const worksheet = XLSX.utils.json_to_sheet(
      dataToExport.map((r) => ({
        Email: r.email,
        Result: r.result,
        Reason: r.reason || "",
        Format: r.format_valid ? "✓" : "✗",
        Domain: r.domain_valid ? "✓" : "✗",
        Deliverable: r.deliverable ? "✓" : "✗",
        "Catch-All": r.catch_all ? "Yes" : "No",
        Disposable: r.disposable ? "Yes" : "No",
        "Free Email": r.free_email ? "Yes" : "No",
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
    XLSX.writeFile(
      workbook,
      `${list?.name}_${onlyValid ? "valid" : "all"}_${Date.now()}.xlsx`
    );

    toast({
      title: "Export completato",
      description: `${dataToExport.length} email esportate`,
    });
  };

  if (loading || !list) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Caricamento...</div>
      </div>
    );
  }

  const pieData = [
    {
      name: "Deliverable",
      value: list.deliverable_count,
      color: COLORS.deliverable.start,
      gradient: `url(#deliverableGradient)`,
      description: "The recipient is valid and email can be delivered.",
    },
    {
      name: "Undeliverable",
      value: list.undeliverable_count,
      color: COLORS.undeliverable.start,
      gradient: `url(#undeliverableGradient)`,
      description: "The recipient is invalid and email cannot be delivered.",
    },
    {
      name: "Risky",
      value: list.risky_count,
      color: COLORS.risky.start,
      gradient: `url(#riskyGradient)`,
      description: "The email address is valid but the deliverability is uncertain.",
    },
    {
      name: "Unknown",
      value: list.unknown_count,
      color: COLORS.unknown.start,
      gradient: `url(#unknownGradient)`,
      description: "The address format is correct, but we could not communicate with the recipient's server.",
    },
  ].filter((item) => item.value > 0);

  const calculatePercentage = (count: number) => {
    return ((count / list.total_emails) * 100).toFixed(1);
  };

  // Breakdown data for categories
  const undeliverableReasons = results
    .filter((r) => r.result === "undeliverable")
    .reduce((acc, r) => {
      const reason = r.reason || "other";
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const riskyReasons = results
    .filter((r) => r.result === "risky")
    .reduce((acc, r) => {
      if (r.catch_all) acc["catch_all"] = (acc["catch_all"] || 0) + 1;
      if (r.disposable) acc["disposable"] = (acc["disposable"] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const unknownReasons = results
    .filter((r) => r.result === "unknown")
    .reduce((acc, r) => {
      const reason = r.reason || "other";
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link to="/validate">
              <Button
                variant="ghost"
                size="sm"
                className="mb-2 text-slate-400 hover:text-slate-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Torna alle liste
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white">{list.name}</h1>
            <p className="text-sm text-slate-400">
              Creata {new Date(list.created_at).toLocaleDateString("it-IT", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => exportResults(false)}
              className="bg-slate-800/30 border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              <FileText className="mr-2 h-4 w-4" />
              File originale
            </Button>
            <Button
              onClick={() => exportResults(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              <Download className="mr-2 h-4 w-4" />
              Scarica risultati
            </Button>
          </div>
        </div>

        {/* List Summary - MAIN CHART */}
        <Card className="p-8 mb-6 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-800/50 border-slate-700 shadow-2xl">
          <h2 className="text-2xl font-semibold mb-8 text-white">Riepilogo Lista</h2>
          
          <div className="relative">
            {/* Massive Pie Chart */}
            <div className="flex items-center justify-center mb-8" style={{ filter: 'drop-shadow(0 0 40px rgba(59, 130, 246, 0.3))' }}>
              <ResponsiveContainer width="100%" height={500}>
                <PieChart>
                  <defs>
                    <radialGradient id="deliverableGradient">
                      <stop offset="0%" stopColor={COLORS.deliverable.end} />
                      <stop offset="100%" stopColor={COLORS.deliverable.start} />
                    </radialGradient>
                    <radialGradient id="undeliverableGradient">
                      <stop offset="0%" stopColor={COLORS.undeliverable.end} />
                      <stop offset="100%" stopColor={COLORS.undeliverable.start} />
                    </radialGradient>
                    <radialGradient id="riskyGradient">
                      <stop offset="0%" stopColor={COLORS.risky.end} />
                      <stop offset="100%" stopColor={COLORS.risky.start} />
                    </radialGradient>
                    <radialGradient id="unknownGradient">
                      <stop offset="0%" stopColor={COLORS.unknown.end} />
                      <stop offset="100%" stopColor={COLORS.unknown.start} />
                    </radialGradient>
                  </defs>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={120}
                    outerRadius={200}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.gradient} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center Label */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-6xl font-bold text-white mb-1" style={{ textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>
                  {list.total_emails.toLocaleString()}
                </div>
                <div className="text-sm text-slate-400 uppercase tracking-wider">Total Emails</div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {pieData.map((item) => (
                <div
                  key={item.name}
                  className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/60 transition-all"
                  style={{
                    boxShadow: `0 0 20px ${item.color}15`
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${COLORS[item.name.toLowerCase() as keyof typeof COLORS].start}, ${COLORS[item.name.toLowerCase() as keyof typeof COLORS].end})`,
                        boxShadow: `0 0 12px ${COLORS[item.name.toLowerCase() as keyof typeof COLORS].glow}`
                      }}
                    />
                    <span className="font-semibold text-white text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-white">
                      {item.value.toLocaleString()}
                    </span>
                    <span className="text-lg font-semibold" style={{ color: item.color }}>
                      {calculatePercentage(item.value)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Category Breakdowns with Mini Pie Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Undeliverable Breakdown */}
          {list.undeliverable_count > 0 && (
            <Card className="p-4 bg-slate-900/50 border-slate-700/50 hover:border-red-500/30 transition-all">
              <h3 className="text-base font-semibold mb-4 text-red-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-red-500 to-pink-600" style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)' }} />
                Undeliverable
              </h3>
              
              <div className="flex items-center justify-center mb-4">
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <defs>
                      {Object.keys(undeliverableReasons).map((reason, idx) => (
                        <radialGradient key={reason} id={`undeliverable-${idx}`}>
                          <stop offset="0%" stopColor={`hsl(${idx * 60}, 70%, 60%)`} />
                          <stop offset="100%" stopColor={`hsl(${idx * 60}, 70%, 45%)`} />
                        </radialGradient>
                      ))}
                    </defs>
                    <Pie
                      data={Object.entries(undeliverableReasons).map(([name, value], idx) => ({
                        name,
                        value,
                        fill: `url(#undeliverable-${idx})`
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {Object.entries(undeliverableReasons).map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 capitalize">{reason.replace(/_/g, " ")}</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-semibold text-white">{count}</span>
                      <span className="text-[10px] text-slate-500">
                        {((count / list.undeliverable_count) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Risky Breakdown */}
          {list.risky_count > 0 && (
            <Card className="p-4 bg-slate-900/50 border-slate-700/50 hover:border-amber-500/30 transition-all">
              <h3 className="text-base font-semibold mb-4 text-amber-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400" style={{ boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)' }} />
                Risky
              </h3>
              
              <div className="flex items-center justify-center mb-4">
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <defs>
                      {Object.keys(riskyReasons).map((reason, idx) => (
                        <radialGradient key={reason} id={`risky-${idx}`}>
                          <stop offset="0%" stopColor={`hsl(${40 + idx * 30}, 90%, 60%)`} />
                          <stop offset="100%" stopColor={`hsl(${40 + idx * 30}, 90%, 50%)`} />
                        </radialGradient>
                      ))}
                    </defs>
                    <Pie
                      data={Object.entries(riskyReasons).map(([name, value], idx) => ({
                        name,
                        value,
                        fill: `url(#risky-${idx})`
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {Object.entries(riskyReasons).map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 capitalize">{reason.replace(/_/g, " ")}</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-semibold text-white">{count}</span>
                      <span className="text-[10px] text-slate-500">
                        {((count / list.risky_count) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Unknown Breakdown */}
          {list.unknown_count > 0 && (
            <Card className="p-4 bg-slate-900/50 border-slate-700/50 hover:border-indigo-500/30 transition-all">
              <h3 className="text-base font-semibold mb-4 text-indigo-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" style={{ boxShadow: '0 0 8px rgba(99, 102, 241, 0.6)' }} />
                Unknown
              </h3>
              
              <div className="flex items-center justify-center mb-4">
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <defs>
                      {Object.keys(unknownReasons).map((reason, idx) => (
                        <radialGradient key={reason} id={`unknown-${idx}`}>
                          <stop offset="0%" stopColor={`hsl(${240 + idx * 20}, 70%, 60%)`} />
                          <stop offset="100%" stopColor={`hsl(${240 + idx * 20}, 70%, 50%)`} />
                        </radialGradient>
                      ))}
                    </defs>
                    <Pie
                      data={Object.entries(unknownReasons).map(([name, value], idx) => ({
                        name,
                        value,
                        fill: `url(#unknown-${idx})`
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '6px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {Object.entries(unknownReasons).map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 capitalize">{reason.replace(/_/g, " ")}</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-semibold text-white">{count}</span>
                      <span className="text-[10px] text-slate-500">
                        {((count / list.unknown_count) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Emails Table */}
        <Card className="p-6 bg-slate-900/50 border-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Email</h2>
            <Badge className="bg-slate-700 text-slate-300">
              Limitata a 250 righe
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            La seguente tabella mostra un campione della lista. Puoi scaricare la lista completa cliccando il pulsante sopra.
          </p>

          <div className="rounded-lg border border-slate-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-800/50 hover:bg-slate-800/50">
                  <TableHead className="text-slate-300">Email</TableHead>
                  <TableHead className="text-slate-300">Risultato</TableHead>
                  <TableHead className="text-slate-300">Motivo</TableHead>
                  <TableHead className="text-slate-300 text-center">Formato</TableHead>
                  <TableHead className="text-slate-300 text-center">Dominio</TableHead>
                  <TableHead className="text-slate-300 text-center">Deliverable</TableHead>
                  <TableHead className="text-slate-300 text-center">Catch-all</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.slice(0, 250).map((result) => (
                  <TableRow
                    key={result.id}
                    className="border-slate-700 hover:bg-slate-800/30"
                  >
                    <TableCell className="font-mono text-sm text-slate-300">
                      {result.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          result.result === "deliverable"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : result.result === "undeliverable"
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : result.result === "risky"
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                        }
                      >
                        {result.result}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {result.reason || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {result.format_valid ? (
                        <span className="text-emerald-400">✓</span>
                      ) : (
                        <span className="text-red-400">✗</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {result.domain_valid ? (
                        <span className="text-emerald-400">✓</span>
                      ) : (
                        <span className="text-red-400">✗</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {result.deliverable ? (
                        <span className="text-emerald-400">✓</span>
                      ) : (
                        <span className="text-red-400">✗</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {result.catch_all ? (
                        <span className="text-slate-400">✓</span>
                      ) : (
                        <span className="text-slate-600">✗</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ValidationResults;
