import { useState } from "react";
import { AdvancedQueryBuilder } from "@/components/AdvancedQueryBuilder";
import { ContactsTable } from "@/components/ContactsTable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Database } from "lucide-react";
import logo from "@/assets/logo.png";

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
        <header className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <img src={logo} alt="BluelimeLeads.com" className="h-16 w-16" />
              <div>
                <h1 className="text-4xl font-bold text-foreground">BluelimeLeads.com</h1>
                <p className="text-muted-foreground text-lg">Motore di ricerca contatti professionale</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/auth')} variant="outline">
                Accedi
              </Button>
              <Button onClick={() => navigate('/dashboard')} className="bg-primary hover:bg-primary-hover">
                <Database className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </div>
          </div>
          
          {/* Quick Guide */}
          <div className="bg-card border border-border rounded-lg p-4 mt-6">
            <h3 className="font-semibold text-primary mb-2">💡 Come usare:</h3>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. Compila i campi di ricerca qui sotto</li>
              <li>2. Clicca "Cerca" per avviare la ricerca</li>
              <li>3. I risultati appariranno nella tabella sotto</li>
              <li>4. Vai alla Dashboard per vedere tutte le ricerche salvate</li>
            </ol>
          </div>
        </header>

        <div className="max-w-5xl mx-auto space-y-8">
          <AdvancedQueryBuilder onQueryGenerated={handleQueryGenerated} onSearch={handleSearch} />
          
          {progress && (
            <div className="text-center py-4 bg-primary/10 border border-primary rounded-lg">
              <div className="text-primary font-medium">
                🔍 Cercando pagina {progress.current} di {progress.total}...
              </div>
            </div>
          )}
          
          <ContactsTable contacts={contacts} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default Index;
