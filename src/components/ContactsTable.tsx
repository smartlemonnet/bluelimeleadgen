import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Globe, Building, Download } from "lucide-react";
import * as XLSX from 'xlsx';

interface Contact {
  id: string;
  name: string | null;
  organization: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  social_links: any;
}

interface ContactsTableProps {
  contacts: Contact[];
  isLoading: boolean;
}

export const ContactsTable = ({ contacts, isLoading }: ContactsTableProps) => {
  const exportToExcel = () => {
    const dataToExport = contacts.map(contact => ({
      Nome: contact.name || '',
      Organizzazione: contact.organization || '',
      Email: contact.email || '',
      Telefono: contact.phone || '',
      Website: contact.website || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contatti");
    
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `contatti-${timestamp}.xlsx`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risultati</CardTitle>
          <CardDescription>Ricerca in corso...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (contacts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risultati</CardTitle>
          <CardDescription>Nessun contatto trovato</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Esegui una ricerca per vedere i risultati qui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Contatti Trovati ({contacts.length})</CardTitle>
            <CardDescription>I contatti estratti dalla tua ricerca</CardDescription>
          </div>
          <Button onClick={exportToExcel} className="gap-2">
            <Download className="h-4 w-4" />
            Esporta Email
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Organizzazione</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>Website</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">
                    {contact.name || <span className="text-muted-foreground">N/A</span>}
                  </TableCell>
                  <TableCell>
                    {contact.organization ? (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        {contact.organization}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Mail className="h-4 w-4" />
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {contact.phone}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.website ? (
                      <a
                        href={contact.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Globe className="h-4 w-4" />
                        Link
                      </a>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
