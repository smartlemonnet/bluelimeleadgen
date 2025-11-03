import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Database, Search, Users, Zap, Mail, Target, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import logo from "@/assets/logo.png";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Search,
      title: "Ricerca Avanzata",
      description: "Trova contatti professionali con query personalizzate e filtri avanzati"
    },
    {
      icon: Users,
      title: "Database Illimitato",
      description: "Accedi a milioni di contatti verificati in tutto il mondo"
    },
    {
      icon: Zap,
      title: "Elaborazione Batch",
      description: "Processa migliaia di ricerche in parallelo con il nostro sistema batch"
    },
    {
      icon: Mail,
      title: "Validazione Email",
      description: "Verifica la validità degli indirizzi email prima di contattarli"
    },
    {
      icon: Target,
      title: "Targeting Preciso",
      description: "Filtra per località, settore, dimensione azienda e molto altro"
    },
    {
      icon: Database,
      title: "Export Facile",
      description: "Esporta i tuoi contatti in CSV, Excel o altri formati"
    }
  ];

  const stats = [
    { value: "10M+", label: "Contatti Disponibili" },
    { value: "99%", label: "Accuratezza Dati" },
    { value: "24/7", label: "Supporto Attivo" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src={logo} alt="BluelimeLeads.com" className="h-12 w-auto" style={{ width: '38.4px' }} />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                  BluelimeLeads
                </h1>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/auth')} variant="outline">
                Accedi
              </Button>
              <Button onClick={() => navigate('/dashboard')} className="bg-primary hover:bg-primary/90">
                <Database className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="container mx-auto relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-block">
              <span className="text-sm font-semibold px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
                Motore di Ricerca Contatti Professionale
              </span>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold leading-tight">
              Trova i Contatti Giusti per il Tuo{" "}
              <span className="bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                Business
              </span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Accedi a milioni di contatti verificati, valida email in tempo reale e gestisci le tue ricerche 
              con il più potente strumento di lead generation sul mercato.
            </p>

            <div className="flex gap-4 justify-center flex-wrap">
              <Button 
                size="lg" 
                onClick={() => navigate('/dashboard')}
                className="bg-primary hover:bg-primary/90 text-lg px-8 py-6"
              >
                Inizia Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/auth')}
                className="text-lg px-8 py-6"
              >
                Scopri di Più
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Tutto Ciò di Cui Hai Bisogno
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Strumenti potenti per trovare, verificare e gestire i tuoi contatti professionali
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow border-border bg-card">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Come Funziona
            </h3>
            <p className="text-lg text-muted-foreground">
              Tre semplici passaggi per ottenere i tuoi contatti
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Crea la Tua Ricerca",
                description: "Definisci i parametri di ricerca con filtri avanzati per trovare esattamente i contatti che ti servono"
              },
              {
                step: "02",
                title: "Valida i Risultati",
                description: "Verifica automaticamente la validità degli indirizzi email per garantire la massima deliverability"
              },
              {
                step: "03",
                title: "Esporta e Usa",
                description: "Scarica i tuoi contatti verificati e inizia subito le tue campagne di outreach"
              }
            ].map((item, index) => (
              <div key={index} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{item.step}</span>
                </div>
                <div className="flex-1 pt-2">
                  <h4 className="text-2xl font-semibold mb-2">{item.title}</h4>
                  <p className="text-muted-foreground text-lg">{item.description}</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-primary mt-4 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-green-500/10 to-blue-500/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto a Iniziare?
          </h3>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Unisciti a migliaia di professionisti che usano BluelimeLeads per far crescere il loro business
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              onClick={() => navigate('/dashboard')}
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-6"
            >
              Accedi alla Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 BluelimeLeads.com - Tutti i diritti riservati</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
