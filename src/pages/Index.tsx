import { useState } from "react";
import { AdvancedQueryBuilder } from "@/components/AdvancedQueryBuilder";
import { ContactsTable } from "@/components/ContactsTable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Database } from "lucide-react";

interface Contact {
  id: string;
  name: string | null;
  organization: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  social_links: any;
}

const Index = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleQueryGenerated = (generatedQuery: string) => {
    console.log("Query generata:", generatedQuery);
  };

  const handleSearch = async (query: string, location?: string, pages: number = 1) => {
    setIsLoading(true);
    setContacts([]);
    setProgress({ current: 0, total: pages });

    try {
      const { data, error } = await supabase.functions.invoke('search-contacts', {
        body: { query, location, pages }
      });

      if (error) throw error;

      if (data.contacts && data.contacts.length > 0) {
        setContacts(data.contacts);
        toast({
          title: "Ricerca completata",
          description: `Trovati ${data.contacts.length} contatti unici da ${pages} pagine`,
        });
      } else {
        toast({
          title: "Nessun risultato",
          description: "Nessun contatto trovato per questa ricerca",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error searching:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la ricerca",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <div className="flex justify-end gap-2 mb-4">
            <Button onClick={() => navigate('/auth')} variant="outline">
              Accedi
            </Button>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              <Database className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Email Scraper</h1>
          <p className="text-muted-foreground">Trova email e contatti dai motori di ricerca</p>
        </header>

        <div className="max-w-4xl mx-auto space-y-8">
          <AdvancedQueryBuilder onQueryGenerated={handleQueryGenerated} />
          {progress && (
            <div className="text-center text-sm text-muted-foreground">
              Cercando pagina {progress.current} di {progress.total}...
            </div>
          )}
          <ContactsTable contacts={contacts} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default Index;
