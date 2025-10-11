import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Mail, ArrowLeft, Download } from "lucide-react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import EmailValidationChart from "@/components/EmailValidationChart";
import EmailResultsList from "@/components/EmailResultsList";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ValidationList {
  id: string;
  name: string;
  total_emails: number;
  processed_emails: number;
  deliverable_count: number;
  undeliverable_count: number;
  risky_count: number;
  unknown_count: number;
  status: string;
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
  full_response: any;
}

const Validate = () => {
  const [emails, setEmails] = useState<string[]>([]);
  const [listName, setListName] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationHistory, setValidationHistory] = useState<ValidationList[]>([]);
  const [selectedList, setSelectedList] = useState<ValidationList | null>(null);
  const [results, setResults] = useState<ValidationResult[]>([]);

  useEffect(() => {
    loadValidationHistory();
  }, []);

  const loadValidationHistory = async () => {
    const { data, error } = await supabase
      .from("validation_lists")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error loading history:", error);
      return;
    }

    setValidationHistory(data || []);
  };

  const loadValidationResults = async (listId: string) => {
    const { data: listData } = await supabase
      .from("validation_lists")
      .select("*")
      .eq("id", listId)
      .single();

    if (listData) {
      setSelectedList(listData);
    }

    const { data, error } = await supabase
      .from("validation_results")
      .select("*")
      .eq("validation_list_id", listId);

    if (error) {
      console.error("Error loading results:", error);
      return;
    }

    setResults(data || []);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        const emailList: string[] = [];
        jsonData.forEach((row: any) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              if (typeof cell === "string" && cell.includes("@")) {
                emailList.push(cell.trim());
              }
            });
          }
        });

        setEmails([...new Set(emailList)]);
        toast({
          title: "File caricato",
          description: `${emailList.length} email uniche trovate`,
        });
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile leggere il file",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleValidate = async () => {
    if (emails.length === 0) {
      toast({
        title: "Nessuna email",
        description: "Carica prima un file con le email",
        variant: "destructive",
      });
      return;
    }

    if (!listName) {
      toast({
        title: "Nome richiesto",
        description: "Inserisci un nome per questa validazione",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);

    try {
      const { data, error } = await supabase.functions.invoke("validate-emails", {
        body: { emails, listName },
      });

      if (error) throw error;

      toast({
        title: "✅ Validazione completata",
        description: `${data.summary.deliverable} email valide su ${data.summary.total}`,
      });

      await loadValidationResults(data.list_id);
      await loadValidationHistory();
      setEmails([]);
      setListName("");
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const exportResults = (onlyValid: boolean) => {
    const dataToExport = onlyValid
      ? results.filter((r) => r.deliverable)
      : results;

    const worksheet = XLSX.utils.json_to_sheet(
      dataToExport.map((r) => ({
        Email: r.email,
        Risultato: r.result,
        "Formato Valido": r.format_valid ? "Sì" : "No",
        "Dominio Valido": r.domain_valid ? "Sì" : "No",
        "SMTP Valido": r.smtp_valid ? "Sì" : "No",
        "Catch-All": r.catch_all ? "Sì" : "No",
        Temporanea: r.disposable ? "Sì" : "No",
        Gratuita: r.free_email ? "Sì" : "No",
        Motivo: r.reason || "",
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Risultati");
    XLSX.writeFile(
      workbook,
      `validazione_${onlyValid ? "valide" : "tutte"}_${new Date().getTime()}.xlsx`
    );

    toast({
      title: "Export completato",
      description: `${dataToExport.length} email esportate`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Validazione Email</h1>
          <p className="text-muted-foreground">
            Validazioni illimitate con mails.so • Dati dettagliati e precisi
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* BEFORE - Left Side */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Mail className="h-6 w-6" />
              Prima della Validazione
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="listName">Nome Lista</Label>
                <Input
                  id="listName"
                  placeholder="Es: Lista clienti Q4 2024"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  disabled={isValidating}
                />
              </div>

              <div>
                <Label htmlFor="file">Carica File CSV/Excel</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={isValidating}
                />
              </div>

              {emails.length > 0 && (
                <>
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Email da validare:</span>
                      <Badge variant="secondary">{emails.length}</Badge>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                      {emails.slice(0, 20).map((email, idx) => (
                        <div key={idx} className="text-muted-foreground">
                          {email}
                        </div>
                      ))}
                      {emails.length > 20 && (
                        <div className="text-muted-foreground italic">
                          ... e altre {emails.length - 20} email
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleValidate}
                    disabled={isValidating}
                    className="w-full"
                    size="lg"
                  >
                    {isValidating ? (
                      "🔄 Validazione in corso..."
                    ) : (
                      <>
                        <Upload className="mr-2 h-5 w-5" />
                        🔍 VALIDA TUTTE ({emails.length} email)
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* AFTER - Right Side */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Dopo la Validazione</h2>

            {selectedList && results.length > 0 ? (
              <div className="space-y-6">
                <EmailValidationChart validationList={selectedList} />

                <div className="flex gap-2">
                  <Button
                    onClick={() => exportResults(true)}
                    variant="default"
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Esporta SOLO Valide
                  </Button>
                  <Button
                    onClick={() => exportResults(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Esporta Tutte
                  </Button>
                </div>

                <EmailResultsList results={results} />
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <Mail className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Carica e valida le email per vedere i risultati qui</p>
              </div>
            )}
          </Card>
        </div>

        {/* Validation History */}
        {validationHistory.length > 0 && (
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Storico Validazioni</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Totale</TableHead>
                  <TableHead>Valide</TableHead>
                  <TableHead>Rischiose</TableHead>
                  <TableHead>Invalide</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validationHistory.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{list.name}</TableCell>
                    <TableCell>
                      {new Date(list.created_at).toLocaleDateString("it-IT")}
                    </TableCell>
                    <TableCell>{list.total_emails}</TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20">
                        {list.deliverable_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20">
                        {list.risky_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-red-500/10 text-red-700 hover:bg-red-500/20">
                        {list.undeliverable_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={list.status === "completed" ? "default" : "secondary"}
                      >
                        {list.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => loadValidationResults(list.id)}
                      >
                        Visualizza
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Validate;
