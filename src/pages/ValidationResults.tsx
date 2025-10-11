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
  deliverable: "#10b981",
  undeliverable: "#ef4444",
  risky: "#f59e0b",
  unknown: "#6b7280",
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
      color: COLORS.deliverable,
      description: "The recipient is valid and email can be delivered.",
    },
    {
      name: "Undeliverable",
      value: list.undeliverable_count,
      color: COLORS.undeliverable,
      description: "The recipient is invalid and email cannot be delivered.",
    },
    {
      name: "Risky",
      value: list.risky_count,
      color: COLORS.risky,
      description: "The email address is valid but the deliverability is uncertain.",
    },
    {
      name: "Unknown",
      value: list.unknown_count,
      color: COLORS.unknown,
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

        {/* List Summary */}
        <Card className="p-6 mb-6 bg-slate-900/50 border-slate-800">
          <h2 className="text-xl font-semibold mb-6 text-white">Riepilogo Lista</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Main Pie Chart */}
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <div className="text-4xl font-bold text-white">
                  {list.total_emails.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-4">
              {pieData.map((item) => (
                <div
                  key={item.name}
                  className="p-4 rounded-lg bg-slate-800/30 border border-slate-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold text-white">{item.name}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">
                        {item.value.toLocaleString()}
                      </span>
                      <span className="text-sm text-slate-400">
                        {calculatePercentage(item.value)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Category Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Undeliverable Breakdown */}
          {list.undeliverable_count > 0 && (
            <Card className="p-5 bg-slate-900/50 border-slate-800">
              <h3 className="text-lg font-semibold mb-4 text-red-400">Undeliverable</h3>
              <div className="space-y-3">
                {Object.entries(undeliverableReasons).map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 capitalize">{reason.replace(/_/g, " ")}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-white">{count}</span>
                      <span className="text-xs text-slate-500">
                        {((count / list.undeliverable_count) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Risky Breakdown */}
          {list.risky_count > 0 && (
            <Card className="p-5 bg-slate-900/50 border-slate-800">
              <h3 className="text-lg font-semibold mb-4 text-amber-400">Risky</h3>
              <div className="space-y-3">
                {Object.entries(riskyReasons).map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 capitalize">{reason.replace(/_/g, " ")}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-white">{count}</span>
                      <span className="text-xs text-slate-500">
                        {((count / list.risky_count) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Unknown Breakdown */}
          {list.unknown_count > 0 && (
            <Card className="p-5 bg-slate-900/50 border-slate-800">
              <h3 className="text-lg font-semibold mb-4 text-slate-400">Unknown</h3>
              <div className="space-y-3">
                {Object.entries(unknownReasons).map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 capitalize">{reason.replace(/_/g, " ")}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-white">{count}</span>
                      <span className="text-xs text-slate-500">
                        {((count / list.unknown_count) * 100).toFixed(1)}%
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
