import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Search, Mail, ArrowLeft, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx';

interface Contact {
  id: string;
  name: string | null;
  organization: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  created_at: string;
  search_id: string;
}

interface SearchRecord {
  id: string;
  query: string;
  location: string | null;
  created_at: string;
}

const Dashboard = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searches, setSearches] = useState<SearchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [contactsRes, searchesRes] = await Promise.all([
        supabase.from('contacts').select('*').order('created_at', { ascending: false }),
        supabase.from('searches').select('*').order('created_at', { ascending: false })
      ]);

      if (contactsRes.error) throw contactsRes.error;
      if (searchesRes.error) throw searchesRes.error;

      setContacts(contactsRes.data || []);
      setSearches(searchesRes.data || []);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore nel caricamento dei dati",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = (data: any[], filename: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    
    toast({
      title: "Export completato",
      description: `File ${filename}.xlsx scaricato con successo`,
    });
  };

  const exportContacts = () => {
    const dataToExport = contacts.map(c => ({
      Email: c.email || '',
      Nome: c.name || '',
      Organizzazione: c.organization || '',
      Telefono: c.phone || '',
      Website: c.website || '',
      'Data creazione': new Date(c.created_at).toLocaleString('it-IT'),
    }));
    exportToExcel(dataToExport, 'tutti_i_contatti');
  };

  const exportSearchContacts = (searchId: string, searchQuery: string) => {
    const searchContacts = contacts.filter(c => c.search_id === searchId);
    const dataToExport = searchContacts.map(c => ({
      Email: c.email || '',
      Nome: c.name || '',
      Organizzazione: c.organization || '',
      Telefono: c.phone || '',
      Website: c.website || '',
      'Data creazione': new Date(c.created_at).toLocaleString('it-IT'),
    }));
    const filename = `contatti_${searchQuery.replace(/\s+/g, '_').toLowerCase()}`;
    exportToExcel(dataToExport, filename);
  };

  const exportSearches = () => {
    const dataToExport = searches.map(s => ({
      Query: s.query,
      Località: s.location || '',
      'Data ricerca': new Date(s.created_at).toLocaleString('it-IT'),
    }));
    exportToExcel(dataToExport, 'ricerche');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna alla ricerca
            </Button>
            <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Visualizza ed esporta i tuoi dati</p>
          </div>
          <Button onClick={() => navigate('/batch')} size="lg">
            <Zap className="mr-2 h-4 w-4" />
            Code Automatiche
          </Button>
        </div>

        <Tabs defaultValue="contacts" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="contacts">
              <Mail className="mr-2 h-4 w-4" />
              Contatti ({contacts.length})
            </TabsTrigger>
            <TabsTrigger value="searches">
              <Search className="mr-2 h-4 w-4" />
              Ricerche ({searches.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Contatti salvati</CardTitle>
                    <CardDescription>
                      Tutti i contatti estratti dalle tue ricerche
                    </CardDescription>
                  </div>
                  <Button onClick={exportContacts} disabled={contacts.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Esporta in Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8">Caricamento...</p>
                ) : contacts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nessun contatto salvato</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Organizzazione</TableHead>
                          <TableHead>Telefono</TableHead>
                          <TableHead>Website</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contacts.map((contact) => (
                          <TableRow key={contact.id}>
                            <TableCell className="font-medium">
                              {contact.email ? (
                                <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                                  {contact.email}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>{contact.name || <span className="text-muted-foreground">N/A</span>}</TableCell>
                            <TableCell>{contact.organization || <span className="text-muted-foreground">N/A</span>}</TableCell>
                            <TableCell>{contact.phone || <span className="text-muted-foreground">N/A</span>}</TableCell>
                            <TableCell>
                              {contact.website ? (
                                <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  Link
                                </a>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(contact.created_at).toLocaleDateString('it-IT')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="searches">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ricerche effettuate</CardTitle>
                    <CardDescription>
                      Storico di tutte le ricerche
                    </CardDescription>
                  </div>
                  <Button onClick={exportSearches} disabled={searches.length === 0}>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
