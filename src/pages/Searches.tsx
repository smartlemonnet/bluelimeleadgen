import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx';

interface Contact {
  id: string;
  search_id: string;
}

interface SearchRecord {
  id: string;
  query: string;
  location: string | null;
  created_at: string;
}

const Searches = () => {
  const [searches, setSearches] = useState<SearchRecord[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Utente non autenticato");
      }

      // First get all user's searches
      const searchesRes = await supabase
        .from('searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (searchesRes.error) throw searchesRes.error;

      const searchIds = (searchesRes.data || []).map(s => s.id);

      // Then get contacts for those searches
      const contactsRes = searchIds.length > 0 
        ? await supabase.from('contacts').select('id, search_id').in('search_id', searchIds)
        : { data: [], error: null };

      if (contactsRes.error) throw contactsRes.error;

      setSearches(searchesRes.data || []);
      setContacts(contactsRes.data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Errore",
        description: errorMessage || "Errore nel caricamento dei dati",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportSearchContacts = async (searchId: string, searchQuery: string) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('search_id', searchId);

      if (error) throw error;

      const dataToExport = (data || []).map(c => ({
        Email: c.email || '',
        Nome: c.name || '',
        Organizzazione: c.organization || '',
        Telefono: c.phone || '',
        Website: c.website || '',
        'Data creazione': new Date(c.created_at).toLocaleString('it-IT'),
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const filename = `contatti_${searchQuery.replace(/\s+/g, '_').toLowerCase()}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Export completato",
        description: `File ${filename} scaricato con successo`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Errore",
        description: errorMessage || "Errore nell'export",
        variant: "destructive",
      });
    }
  };

  const exportAllSearches = () => {
    const dataToExport = searches.map(s => ({
      Query: s.query,
      Località: s.location || '',
      'Data ricerca': new Date(s.created_at).toLocaleString('it-IT'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, 'ricerche.xlsx');

    toast({
      title: "Export completato",
      description: "File ricerche.xlsx scaricato con successo",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna alla Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Ricerche effettuate ({searches.length})</CardTitle>
                <CardDescription>
                  Storico di tutte le ricerche
                </CardDescription>
              </div>
              <Button onClick={exportAllSearches} disabled={searches.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Esporta in Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Caricamento...</p>
            ) : searches.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nessuna ricerca salvata</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Località</TableHead>
                      <TableHead>Contatti trovati</TableHead>
                      <TableHead>Data ricerca</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searches.map((search) => {
                      const searchContactsCount = contacts.filter(c => c.search_id === search.id).length;
                      return (
                        <TableRow key={search.id}>
                          <TableCell className="font-medium">{search.query}</TableCell>
                          <TableCell>{search.location || <span className="text-muted-foreground">Nessuna</span>}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                              {searchContactsCount} contatti
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(search.created_at).toLocaleString('it-IT')}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => exportSearchContacts(search.id, search.query)}
                              disabled={searchContactsCount === 0}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Esporta
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Searches;
