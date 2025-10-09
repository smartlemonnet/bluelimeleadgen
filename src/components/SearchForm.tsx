import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

interface SearchFormProps {
  onSearch: (query: string, location?: string) => void;
  isLoading: boolean;
}

export const SearchForm = ({ onSearch, isLoading }: SearchFormProps) => {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, location || undefined);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cerca Contatti</CardTitle>
        <CardDescription>
          Inserisci la tua query di ricerca. Es: "dentist" "new york" "@gmail.com"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="query" className="text-sm font-medium">
              Query di ricerca *
            </label>
            <Input
              id="query"
              placeholder='Es: "dentist" "@gmail.com"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-medium">
              Località (opzionale)
            </label>
            <Input
              id="location"
              placeholder='Es: "New York" o "Miami"'
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            <Search className="mr-2 h-4 w-4" />
            {isLoading ? "Ricerca in corso..." : "Cerca"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
