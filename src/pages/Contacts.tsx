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
  name: string | null;
  organization: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  created_at: string;
  search_id: string;
}

const Contacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      // Fetch all contacts with pagination to bypass the 1000 row limit
      let allContacts: Contact[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allContacts = [...allContacts, ...data];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      setContacts(allContacts);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore nel caricamento dei contatti",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = () => {
    const dataToExport = contacts.map(c => ({
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
    XLSX.writeFile(workbook, 'tutti_i_contatti.xlsx');
    
    toast({
      title: "Export completato",
      description: "File scaricato con successo",
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
                <CardTitle>Tutti i Contatti ({contacts.length})</CardTitle>
                <CardDescription>
                  Elenco completo dei contatti estratti dalle ricerche
                </CardDescription>
              </div>
              <Button onClick={exportToExcel} disabled={contacts.length === 0}>
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
      </div>
    </div>
  );
};

export default Contacts;
