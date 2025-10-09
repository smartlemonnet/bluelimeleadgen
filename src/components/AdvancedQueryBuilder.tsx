import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface AdvancedQueryBuilderProps {
  onQueryGenerated: (query: string) => void;
}

export const AdvancedQueryBuilder = ({ onQueryGenerated }: AdvancedQueryBuilderProps) => {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [emailProviders, setEmailProviders] = useState<string[]>([]);
  const [currentProvider, setCurrentProvider] = useState("");
  const [searchEngines, setSearchEngines] = useState<string[]>([]);
  const [currentEngine, setCurrentEngine] = useState("");
  const [websites, setWebsites] = useState<string[]>([]);
  const [currentWebsite, setCurrentWebsite] = useState("");
  const [generatedQuery, setGeneratedQuery] = useState("");

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

  const generateQuery = () => {
    let query = keyword;

    if (location) {
      query += ` ${location}`;
    }

    if (emailProviders.length > 0) {
      const providers = emailProviders.map(p => `"${p}"`).join(" OR ");
      query += ` (${providers})`;
    }

    if (websites.length > 0) {
      const sites = websites.map(w => `site:${w}`).join(" OR ");
      query += ` (${sites})`;
    }

    if (searchEngines.length > 0) {
      query += ` engines: ${searchEngines.join(", ")}`;
    }

    setGeneratedQuery(query);
    onQueryGenerated(query);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Query Builder Avanzato</CardTitle>
        <CardDescription>
          Costruisci query complesse combinando diversi parametri
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        <Button onClick={generateQuery} className="w-full" size="lg">
          Genera Query
        </Button>

        {generatedQuery && (
          <div className="space-y-2">
            <Label>Query generata</Label>
            <Textarea
              value={generatedQuery}
              readOnly
              className="font-mono text-sm"
              rows={4}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
