import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Printer, ArrowLeft, Target, TrendingUp, Search, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UserGuide() {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla Dashboard
          </Button>
          <Button onClick={handlePrint} variant="default">
            <Printer className="mr-2 h-4 w-4" />
            Esporta PDF
          </Button>
        </div>
      </div>

      {/* Guide Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Title */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">BlueLimeLeads</h1>
            <p className="text-xl text-muted-foreground">Guida Utente Completa</p>
            <p className="text-sm text-muted-foreground">
              La piattaforma intelligente per la generazione di lead e contatti influencer
            </p>
          </div>

          <Separator />

          {/* What Makes Us Different */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Cosa Rende BlueLimeLeads Unico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge variant="default" className="mt-1">1</Badge>
                  <div>
                    <h4 className="font-semibold">Dati Sempre Aggiornati da Google</h4>
                    <p className="text-sm text-muted-foreground">
                      A differenza dei database statici e obsoleti dei competitor, BlueLimeLeads cerca contatti 
                      direttamente su Google in tempo reale. Ottieni email attive e aggiornate, non liste vecchie di mesi o anni.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="default" className="mt-1">2</Badge>
                  <div>
                    <h4 className="font-semibold">Segmentazione Intelligente B2B/B2C</h4>
                    <p className="text-sm text-muted-foreground">
                      Unici sul mercato con strategie dedicate per Influencer Marketing (B2B) e Lead Generation (B2C). 
                      Query ottimizzate per ogni obiettivo specifico.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="default" className="mt-1">3</Badge>
                  <div>
                    <h4 className="font-semibold">Controllo Totale sulle Fonti</h4>
                    <p className="text-sm text-muted-foreground">
                      Scegli esattamente dove cercare: Instagram, TikTok, LinkedIn, o tutto il web. 
                      Personalizza le tue ricerche per nicchie specifiche.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="default" className="mt-1">4</Badge>
                  <div>
                    <h4 className="font-semibold">Nessun Database Obsoleto</h4>
                    <p className="text-sm text-muted-foreground">
                      I competitor vendono accesso a database che invecchiano rapidamente. Noi generiamo 
                      lead freschi ogni volta che fai una ricerca.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Market Segmentation */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-foreground">Segmentazione di Mercato</h2>
            
            {/* Influencer Marketing */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Influencer Marketing (B2B)
                </CardTitle>
                <CardDescription>
                  Per chi cerca influencer e content creator da contattare
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">🎯 Target Ideale:</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Agenzie di marketing e comunicazione</li>
                    <li>Brand che cercano collaborazioni con influencer</li>
                    <li>Aziende che vendono prodotti di nicchia</li>
                    <li>Creator che cercano network e partnership</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">📱 Fonti Ottimali:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">site:instagram.com</Badge>
                    <Badge variant="secondary">site:tiktok.com</Badge>
                    <Badge variant="secondary">site:youtube.com</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">✍️ Esempi di Query:</h4>
                  <div className="bg-muted p-3 rounded-md space-y-2 text-sm font-mono">
                    <div>site:instagram.com "fitness" "influencer" "collaboration" email</div>
                    <div>site:tiktok.com "beauty" "creator" "business" @gmail.com</div>
                    <div>site:instagram.com "food blogger" "Milano" (10k OR 50k OR followers) email</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">💰 Valore:</h4>
                  <p className="text-sm text-muted-foreground">
                    <strong>Alto valore per contatto</strong> - Anche con tassi di conversione più bassi (2-5 contatti per ricerca), 
                    ogni email di un influencer rilevante vale molto di più di una lead tradizionale.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Lead Generation */}
            <Card className="border-secondary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-secondary" />
                  Lead Generation (B2C)
                </CardTitle>
                <CardDescription>
                  Per chi cerca email di potenziali clienti e professionisti
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">🎯 Target Ideale:</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Agenzie che vendono servizi B2C</li>
                    <li>Consulenti e freelance</li>
                    <li>Aziende che cercano clienti locali</li>
                    <li>Venditori di prodotti consumer</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">🌐 Fonti Ottimali:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Tutto il Web (NO site:)</Badge>
                    <Badge variant="outline">Directory Professionali</Badge>
                    <Badge variant="outline">Siti Personali</Badge>
                    <Badge variant="outline">Blog</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">✍️ Esempi di Query:</h4>
                  <div className="bg-muted p-3 rounded-md space-y-2 text-sm font-mono">
                    <div>"yoga instructor" "Italy" email</div>
                    <div>"personal trainer" "Milano" contatto @gmail.com</div>
                    <div>"dentist" "Roma" (@gmail.com OR @yahoo.it)</div>
                    <div>"web designer" "freelance" "Firenze" email</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">💰 Valore:</h4>
                  <p className="text-sm text-muted-foreground">
                    <strong>Alto volume di contatti</strong> - Tassi di conversione molto più alti (10-20+ contatti per ricerca). 
                    Perfetto per campagne email massive e outreach B2C.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Getting Fresh Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Come Ottenere Dati Sempre Aggiornati
              </CardTitle>
              <CardDescription>
                Strategie per massimizzare la freschezza dei risultati
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Usa Operatori di Data di Google</h4>
                <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                  <div className="font-mono">after:2024-01-01 "fitness influencer" email</div>
                  <p className="text-muted-foreground">
                    Cerca solo contenuti pubblicati dopo il 1 gennaio 2024
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. Includi l'Anno Corrente nelle Query</h4>
                <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                  <div className="font-mono">"personal trainer" "2025" "Milano" email</div>
                  <p className="text-muted-foreground">
                    Privilegia risultati che menzionano l'anno corrente
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. Cerca Keywords di Freschezza</h4>
                <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                  <div className="font-mono">"yoga" ("new" OR "updated" OR "2025") "contatto"</div>
                  <p className="text-muted-foreground">
                    Cerca profili aggiornati di recente
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4. Combina con Location Specifica</h4>
                <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                  <div className="font-mono">"dietista" "Milano" "2025" email</div>
                  <p className="text-muted-foreground">
                    Location + anno = risultati locali aggiornati
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Best Practices */}
          <Card>
            <CardHeader>
              <CardTitle>Best Practices Generali</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">✓</Badge>
                  <div>
                    <h4 className="font-semibold">Usa Virgolette per Frasi Esatte</h4>
                    <p className="text-sm text-muted-foreground">
                      "personal trainer" cerca esattamente quella frase, personal trainer cerca le parole separate
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge className="mt-1">✓</Badge>
                  <div>
                    <h4 className="font-semibold">Combina Operatori OR</h4>
                    <p className="text-sm text-muted-foreground">
                      (@gmail.com OR @yahoo.it OR @outlook.com) per catturare più provider email
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge className="mt-1">✓</Badge>
                  <div>
                    <h4 className="font-semibold">Sii Specifico con le Nicchie</h4>
                    <p className="text-sm text-muted-foreground">
                      "vegan food blogger" è meglio di solo "food blogger"
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge className="mt-1">✓</Badge>
                  <div>
                    <h4 className="font-semibold">Testa Diverse Varianti</h4>
                    <p className="text-sm text-muted-foreground">
                      Prova "email", "contatto", "contact", "business email" per massimizzare i risultati
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge className="mt-1">✓</Badge>
                  <div>
                    <h4 className="font-semibold">Evita site: per Lead B2C</h4>
                    <p className="text-sm text-muted-foreground">
                      Instagram/TikTok convertono male per professionisti tradizionali. Usa il web aperto.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge className="mt-1">✓</Badge>
                  <div>
                    <h4 className="font-semibold">Usa site: per Influencer</h4>
                    <p className="text-sm text-muted-foreground">
                      Per influencer, Instagram e TikTok sono oro. Concentrati su queste piattaforme.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Quick Reference Table */}
          <Card>
            <CardHeader>
              <CardTitle>Tabella di Riferimento Rapido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Obiettivo</th>
                      <th className="text-left p-3 font-semibold">Fonti</th>
                      <th className="text-left p-3 font-semibold">Keywords</th>
                      <th className="text-left p-3 font-semibold">Risultati Attesi</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b">
                      <td className="p-3 font-medium">Influencer Fitness</td>
                      <td className="p-3">site:instagram.com</td>
                      <td className="p-3">"fitness" "influencer" email</td>
                      <td className="p-3">2-5 contatti/ricerca</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Lead Yoga</td>
                      <td className="p-3">Tutto il web</td>
                      <td className="p-3">"yoga instructor" location email</td>
                      <td className="p-3">10-20+ contatti/ricerca</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Creator TikTok</td>
                      <td className="p-3">site:tiktok.com</td>
                      <td className="p-3">"creator" "business" @gmail.com</td>
                      <td className="p-3">0-2 contatti/ricerca</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Professionisti Locali</td>
                      <td className="p-3">Tutto il web</td>
                      <td className="p-3">professione città email 2025</td>
                      <td className="p-3">15-25+ contatti/ricerca</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Separator className="print:hidden" />

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground print:mt-8">
            <p>BlueLimeLeads - Generazione Intelligente di Lead e Contatti Influencer</p>
            <p className="mt-2">© 2025 BlueLimeLeads. Tutti i diritti riservati.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
