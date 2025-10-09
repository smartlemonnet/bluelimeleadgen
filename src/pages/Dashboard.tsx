import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Mail, ArrowLeft, Zap, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GlobalMap from "@/components/GlobalMap";

const Dashboard = () => {
  const [contactsCount, setContactsCount] = useState(0);
  const [searchesCount, setSearchesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [contactsRes, searchesRes] = await Promise.all([
        supabase.from('contacts').select('id', { count: 'exact', head: true }),
        supabase.from('searches').select('id', { count: 'exact', head: true })
      ]);

      setContactsCount(contactsRes.count || 0);
      setSearchesCount(searchesRes.count || 0);
    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
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
            <p className="text-muted-foreground">Panoramica dei tuoi dati</p>
          </div>
          <Button onClick={() => navigate('/batch')} size="lg">
            <Zap className="mr-2 h-4 w-4" />
            Code Automatiche
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/contacts')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contatti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary mb-2">
                {isLoading ? "..." : contactsCount}
              </div>
              <p className="text-muted-foreground">Contatti totali salvati</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/searches')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Ricerche
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary mb-2">
                {isLoading ? "..." : searchesCount}
              </div>
              <p className="text-muted-foreground">Ricerche effettuate</p>
            </CardContent>
          </Card>
        </div>

        <GlobalMap />
      </div>
    </div>
  );
};

export default Dashboard;
