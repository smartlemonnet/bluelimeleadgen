import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, ArrowLeft, Search, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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
  const navigate = useNavigate();
  const [emails, setEmails] = useState<string[]>([]);
  const [pastedEmails, setPastedEmails] = useState("");
  const [listName, setListName] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationHistory, setValidationHistory] = useState<ValidationList[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadValidationHistory();
  }, []);

  const loadValidationHistory = async () => {
    const { data, error } = await supabase
      .from("validation_lists")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading history:", error);
      return;
    }

    setValidationHistory(data || []);
  };

  const handlePasteEmails = () => {
    const lines = pastedEmails.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const emailList: string[] = [];
    
    lines.forEach(line => {
      // Extract emails from each line (in case there's text around them)
      const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
      const matches = line.match(emailRegex);
      if (matches) {
        emailList.push(...matches);
      }
    });

    const uniqueEmails = [...new Set(emailList)];
    setEmails(uniqueEmails);
    toast({
      title: "Email incollate",
      description: `${uniqueEmails.length} email uniche trovate`,
    });
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
        title: "✅ Validazione avviata",
        description: `${emails.length} email in coda. Processamento parallelo attivo...`,
      });

      // Trigger worker to process queue
      supabase.functions.invoke("process-validation-queue", {
        body: {},
      }).catch(err => console.error('Worker trigger error:', err));

      await loadValidationHistory();
      navigate(`/validate/${data.list_id}`);
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

  const filteredLists = validationHistory.filter((list) =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    if (status === "completed") {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Completed</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4 text-slate-400 hover:text-slate-200">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-2 text-white">Validazione Lista</h1>
          <p className="text-slate-400">
            Valida più indirizzi email contemporaneamente ed esporta i risultati • Validazioni illimitate
          </p>
        </div>

        {/* Pick a Source */}
        <Card className="p-6 mb-6 bg-slate-900/50 border-slate-800">
          <h2 className="text-lg font-semibold mb-4 text-white">Scegli una Sorgente</h2>
          
          <div className="space-y-4">
            <Input
              placeholder="Nome lista (es: Lista clienti Q4 2024)"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              disabled={isValidating}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />

            <Tabs defaultValue="paste" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
                <TabsTrigger value="paste" className="data-[state=active]:bg-slate-700">
                  <FileText className="mr-2 h-4 w-4" />
                  Incolla una lista
                </TabsTrigger>
                <TabsTrigger value="upload" className="data-[state=active]:bg-slate-700">
                  <Upload className="mr-2 h-4 w-4" />
                  Carica un file
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="paste" className="space-y-3">
                <Textarea
                  placeholder="Incolla le email qui (una per riga o separate da virgole)&#10;esempio@email.com&#10;altro@email.com"
                  value={pastedEmails}
                  onChange={(e) => setPastedEmails(e.target.value)}
                  disabled={isValidating}
                  className="min-h-[200px] bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 font-mono text-sm"
                />
                <Button
                  onClick={handlePasteEmails}
                  disabled={isValidating || !pastedEmails.trim()}
                  variant="outline"
                  className="w-full bg-slate-800/30 border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  Estrai Email
                </Button>
              </TabsContent>
              
              <TabsContent value="upload" className="space-y-3">
                <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-slate-600 transition-colors">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-slate-500" />
                  <p className="text-sm text-slate-400 mb-2">
                    Carica un file CSV o Excel
                  </p>
                  <Button
                    variant="outline"
                    className="bg-slate-800/30 border-slate-700 hover:bg-slate-800 text-slate-300 relative"
                    asChild
                  >
                    <label>
                      Seleziona file
                      <Input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        disabled={isValidating}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {emails.length > 0 && (
              <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">Email da validare:</span>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {emails.length} email
                  </Badge>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1 text-sm mb-3">
                  {emails.slice(0, 10).map((email, idx) => (
                    <div key={idx} className="text-slate-400 font-mono text-xs">
                      {email}
                    </div>
                  ))}
                  {emails.length > 10 && (
                    <div className="text-slate-500 italic text-xs">
                      ... e altre {emails.length - 10} email
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  size="lg"
                >
                  {isValidating ? (
                    "🔄 Validazione in corso..."
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      Valida {emails.length} email
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* My Lists */}
        <Card className="p-6 bg-slate-900/50 border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Le Mie Liste ({filteredLists.length})
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Cerca liste..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          {filteredLists.length > 0 ? (
            <div className="space-y-3">
              {filteredLists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-white">{list.name}</h3>
                      {getStatusBadge(list.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>
                        Creata {new Date(list.created_at).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span>{list.total_emails} email</span>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => navigate(`/validate/${list.id}`)}
                    className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-600/30"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Vedi risultati
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>Nessuna lista trovata</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Validate;
