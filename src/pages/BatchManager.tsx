import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Play, Pause, Trash2, Download, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Batch {
  id: string;
  name: string;
  description: string | null;
  status: string;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  delay_seconds: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export default function BatchManager() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [batchName, setBatchName] = useState("");
  const [batchDescription, setBatchDescription] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(120);
  const [csvContent, setCsvContent] = useState("");

  useEffect(() => {
    loadBatches();
    
    // Auto-refresh ogni 10 secondi
    const interval = setInterval(loadBatches, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('search_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBatches(data || []);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
    };
    reader.readAsText(file);
  };

  const createBatch = async () => {
    if (!batchName.trim() || !csvContent.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci nome batch e carica un CSV",
        variant: "destructive",
      });
      return;
    }

    try {
      // Parsing CSV: formato "query,location,pages" oppure "query,location"
      const lines = csvContent.split('\n').filter(l => l.trim());
      const jobs = lines.slice(1).map(line => {
        const parts = line.split(',').map(p => p.trim());
        return {
          query: parts[0],
          location: parts[1] || null,
          pages: parseInt(parts[2]) || 10,
        };
      }).filter(j => j.query);

      if (jobs.length === 0) {
        throw new Error("Nessun job valido trovato nel CSV");
      }

      // Crea il batch
      const { data: batch, error: batchError } = await supabase
        .from('search_batches')
        .insert({
          name: batchName,
          description: batchDescription,
          total_jobs: jobs.length,
          delay_seconds: delaySeconds,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Crea i job
      const jobsToInsert = jobs.map(job => ({
        batch_id: batch.id,
        ...job,
      }));

      const { error: jobsError } = await supabase
        .from('search_jobs')
        .insert(jobsToInsert);

      if (jobsError) throw jobsError;

      toast({
        title: "Successo",
        description: `Batch "${batchName}" creato con ${jobs.length} ricerche`,
      });

      // Reset form
      setBatchName("");
      setBatchDescription("");
      setCsvContent("");
      setShowCreateForm(false);
      loadBatches();

    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startBatch = async (batchId: string) => {
    try {
      await supabase
        .from('search_batches')
        .update({ 
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', batchId);

      toast({
        title: "Batch avviato",
        description: "Il processamento automatico è iniziato",
      });

      loadBatches();

      // Trigger immediate processing
      await supabase.functions.invoke('process-search-queue');

    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const pauseBatch = async (batchId: string) => {
    try {
      await supabase
        .from('search_batches')
        .update({ status: 'paused' })
        .eq('id', batchId);

      toast({
        title: "Batch in pausa",
        description: "Il processamento è stato messo in pausa",
      });

      loadBatches();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteBatch = async (batchId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo batch?")) return;

    try {
      await supabase
        .from('search_batches')
        .delete()
        .eq('id', batchId);

      toast({
        title: "Batch eliminato",
      });

      loadBatches();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const template = `query,location,pages
marketing agentur,Berlin,10
werbeagentur,München,10
digital marketing,Hamburg,10`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      running: "default",
      completed: "outline",
      paused: "secondary",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status.toUpperCase()}</Badge>;
  };

  const getProgress = (batch: Batch) => {
    if (batch.total_jobs === 0) return 0;
    return Math.round((batch.completed_jobs / batch.total_jobs) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold">Gestione Code Automatiche</h1>
            <p className="text-muted-foreground mt-2">
              Crea e gestisci batch di ricerche automatizzate
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Batch
          </Button>
        </div>

        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Crea Nuovo Batch</CardTitle>
              <CardDescription>
                Carica un CSV con le ricerche da eseguire automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="batchName">Nome Batch</Label>
                  <Input
                    id="batchName"
                    placeholder="Es: Agenzie Marketing Germania"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delay">Delay tra ricerche (secondi)</Label>
                  <Input
                    id="delay"
                    type="number"
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 120)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione (opzionale)</Label>
                <Textarea
                  id="description"
                  placeholder="Descrivi l'obiettivo di questo batch..."
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>File CSV</Label>
                  <Button variant="link" size="sm" onClick={downloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Scarica Template
                  </Button>
                </div>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <Label htmlFor="csvFile" className="cursor-pointer">
                    <span className="text-primary hover:underline">
                      Carica CSV
                    </span>
                    <Input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </Label>
                  {csvContent && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      File caricato ({csvContent.split('\n').length - 1} righe)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={createBatch} className="flex-1">
                  Crea Batch
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Annulla
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Batch Attivi</CardTitle>
          </CardHeader>
          <CardContent>
            {batches.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nessun batch creato. Crea il tuo primo batch per iniziare!
              </p>
            ) : (
              <div className="space-y-4">
                {batches.map((batch) => (
                  <Card key={batch.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{batch.name}</CardTitle>
                          {batch.description && (
                            <CardDescription>{batch.description}</CardDescription>
                          )}
                        </div>
                        {getStatusBadge(batch.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progresso</span>
                          <span className="font-medium">
                            {batch.completed_jobs} / {batch.total_jobs} completati
                            {batch.failed_jobs > 0 && ` (${batch.failed_jobs} falliti)`}
                          </span>
                        </div>
                        <Progress value={getProgress(batch)} />
                      </div>

                      <div className="flex gap-2">
                        {batch.status === 'pending' || batch.status === 'paused' ? (
                          <Button onClick={() => startBatch(batch.id)} size="sm">
                            <Play className="mr-2 h-4 w-4" />
                            Avvia
                          </Button>
                        ) : null}
                        
                        {batch.status === 'running' && (
                          <Button onClick={() => pauseBatch(batch.id)} size="sm" variant="outline">
                            <Pause className="mr-2 h-4 w-4" />
                            Pausa
                          </Button>
                        )}

                        <Button 
                          onClick={() => deleteBatch(batch.id)} 
                          size="sm" 
                          variant="destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Elimina
                        </Button>

                        <div className="ml-auto text-sm text-muted-foreground">
                          Delay: {batch.delay_seconds}s tra ricerche
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
