import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Search } from "lucide-react";

interface AdvancedQueryBuilderProps {
  onQueryGenerated: (query: string) => void;
  onSearch: (searchParams: any) => void;
}

export const AdvancedQueryBuilder = ({ onQueryGenerated, onSearch }: AdvancedQueryBuilderProps) => {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [emailProviders, setEmailProviders] = useState<string[]>([]);
  const [currentProvider, setCurrentProvider] = useState("");
  const [searchEngines, setSearchEngines] = useState<string[]>([]);
  const [currentEngine, setCurrentEngine] = useState("");
  const [websites, setWebsites] = useState<string[]>([]);
  const [currentWebsite, setCurrentWebsite] = useState("");
  const [targetNames, setTargetNames] = useState<string[]>([]);
  const [currentName, setCurrentName] = useState("");
  const [generatedQuery, setGeneratedQuery] = useState("");
  const [pages, setPages] = useState(10);

  const addEmailProvider = () => {
    if (currentProvider && !emailProviders.includes(currentProvider)) {
      setEmailProviders([...emailProviders, currentProvider]);
      setCurrentProvider("");
    }
  };

  const removeEmailProvider = (provider: string) => {
    setEmailProviders(emailProviders.filter(p => p !== provider));
  };

  const addSearchEngine = () => {
    if (currentEngine && !searchEngines.includes(currentEngine)) {
      setSearchEngines([...searchEngines, currentEngine]);
      setCurrentEngine("");
    }
  };

  const removeSearchEngine = (engine: string) => {
    setSearchEngines(searchEngines.filter(e => e !== engine));
  };

  const addWebsite = () => {
    if (currentWebsite && !websites.includes(currentWebsite)) {
      setWebsites([...websites, currentWebsite]);
      setCurrentWebsite("");
    }
  };

  const removeWebsite = (website: string) => {
    setWebsites(websites.filter(w => w !== website));
  };

  const addTargetName = () => {
    if (currentName && !targetNames.includes(currentName)) {
      setTargetNames([...targetNames, currentName]);
      setCurrentName("");
    }
  };

  const removeTargetName = (name: string) => {
    setTargetNames(targetNames.filter(n => n !== name));
  };

  const generateQuery = () => {
    // Build REAL search query for Google including all filters
    let searchQueryParts: string[] = [];
    
    if (keyword) searchQueryParts.push(keyword);
    if (location) searchQueryParts.push(`"${location}"`);
    
    // site: filters
    if (websites.length > 0) {
      const sitePart = websites.map(w => `site:${w}`).join(" OR ");
      searchQueryParts.push(`(${sitePart})`);
    }

    // email provider hints (e.g., "@gmail.com" OR "gmail.com")
    if (emailProviders.length > 0) {
      const providerTerms = Array.from(new Set(
        emailProviders.flatMap((raw) => {
          const p = raw.trim();
          if (!p) return [] as string[];
          const terms: string[] = [];
          terms.push(`"${p}"`);
          const noAt = p.replace('@', '');
          if (!p.includes('.')) terms.push(`"${noAt}.com"`);
          return terms;
        })
      ));
      if (providerTerms.length > 0) searchQueryParts.push(`(${providerTerms.join(' OR ')})`);
    }

    // target names
    if (targetNames.length > 0) {
      const namesPart = targetNames.map(n => `"${n}"`).join(' OR ');
      searchQueryParts.push(`(${namesPart})`);
    }
    
    const realQuery = searchQueryParts.join(' ');
    setGeneratedQuery(realQuery);
    onQueryGenerated(realQuery);
  };

  const executeSearch = () => {
    if (!keyword) {
      return;
    }
    
    // Pass all search parameters as an object
    const searchParams = {
      query: keyword,
      location: location || undefined,
      emailProviders,
      searchEngines: searchEngines.length > 0 ? searchEngines : undefined,
      websites,
      targetNames,
      pages
    };
    
    onSearch(searchParams);
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
        <CardTitle className="text-2xl flex items-center gap-2">
          <Search className="h-6 w-6 text-primary" />
          Crea Nuova Ricerca
        </CardTitle>
        <CardDescription className="text-base">
          Compila i campi per avviare una ricerca di contatti
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label htmlFor="keyword">1. Parola chiave o frase</Label>
          <Input
            id="keyword"
            placeholder='es: "web developer" OR "software engineer"'
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">2. Città o luogo</Label>
          <Input
            id="location"
            placeholder="es: Milano, Italia"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>3. Provider email</Label>
          <div className="flex gap-2">
            <Input
              placeholder="es: @gmail.com"
              value={currentProvider}
              onChange={(e) => setCurrentProvider(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addEmailProvider()}
            />
            <Button type="button" onClick={addEmailProvider} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {emailProviders.map(provider => (
              <Badge key={provider} variant="secondary" className="gap-1">
                {provider}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeEmailProvider(provider)}
                />
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>4. Motori di ricerca</Label>
          <div className="flex gap-2">
            <Input
              placeholder="es: google, bing"
              value={currentEngine}
              onChange={(e) => setCurrentEngine(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSearchEngine()}
            />
            <Button type="button" onClick={addSearchEngine} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {searchEngines.map(engine => (
              <Badge key={engine} variant="secondary" className="gap-1">
                {engine}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeSearchEngine(engine)}
                />
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>5. Siti web da cui estrarre</Label>
          <div className="flex gap-2">
            <Input
              placeholder="es: linkedin.com"
              value={currentWebsite}
              onChange={(e) => setCurrentWebsite(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addWebsite()}
            />
            <Button type="button" onClick={addWebsite} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {websites.map(website => (
              <Badge key={website} variant="secondary" className="gap-1">
                {website}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeWebsite(website)}
                />
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>6. Nomi da cercare (opzionale)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="es: Maria, Anna, Vittoria, Elena"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTargetName()}
            />
            <Button type="button" onClick={addTargetName} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Filtra solo i contatti con questi nomi. Lascia vuoto per non filtrare.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {targetNames.map(name => (
              <Badge key={name} variant="secondary" className="gap-1">
                {name}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeTargetName(name)}
                />
              </Badge>
            ))}
          </div>
        </div>

        <Button
          onClick={generateQuery} 
          className="w-full bg-primary hover:bg-primary/90" 
          size="lg"
        >
          <Search className="mr-2 h-5 w-5" />
          Genera Query
        </Button>

        {generatedQuery && (
          <div className="space-y-4 p-4 bg-secondary/10 border-2 border-secondary rounded-lg">
            <div className="space-y-2">
              <Label className="text-secondary font-semibold">✓ Query generata con successo</Label>
              <Textarea
                value={generatedQuery}
                readOnly
                className="font-mono text-sm bg-background"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pages" className="text-foreground">
                Numero di pagine da analizzare
              </Label>
              <Input
                id="pages"
                type="number"
                min="1"
                max="100"
                value={pages}
                onChange={(e) => setPages(parseInt(e.target.value) || 10)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Ogni pagina contiene ~10 risultati. Più pagine = più contatti ma più tempo.
              </p>
            </div>

            <Button 
              onClick={executeSearch}
              className="w-full bg-secondary hover:bg-secondary/90 text-lg font-semibold" 
              size="lg"
            >
              <Search className="mr-2 h-6 w-6" />
              🚀 Avvia Ricerca ({pages} {pages === 1 ? 'pagina' : 'pagine'})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
