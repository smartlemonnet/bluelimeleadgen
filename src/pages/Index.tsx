import { useState } from "react";
import { SearchForm } from "@/components/SearchForm";
import { ContactsTable } from "@/components/ContactsTable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const { toast } = useToast();

  const handleSearch = async (query: string, location?: string) => {
    setIsLoading(true);
    setContacts([]);

    try {
      const { data, error } = await supabase.functions.invoke('search-contacts', {
        body: { query, location }
      });

      if (error) throw error;

      if (data.contacts && data.contacts.length > 0) {
        setContacts(data.contacts);
        toast({
          title: "Ricerca completata",
          description: `Trovati ${data.contacts.length} contatti`,
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
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">Email Scraper</h1>
          <p className="text-muted-foreground">Trova email e contatti dai motori di ricerca</p>
        </header>

        <div className="max-w-4xl mx-auto space-y-8">
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />
          <ContactsTable contacts={contacts} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default Index;
