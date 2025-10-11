import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface ValidationResult {
  id: string;
  email: string;
  result: string;
  format_valid: boolean;
  domain_valid: boolean;
  smtp_valid: boolean;
  catch_all: boolean;
  disposable: boolean;
  free_email: boolean;
  reason: string | null;
  deliverable: boolean;
  full_response: any;
}

interface EmailResultsListProps {
  results: ValidationResult[];
}

const getResultColor = (result: string) => {
  switch (result) {
    case "deliverable":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    case "risky":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "undeliverable":
      return "bg-red-500/10 text-red-700 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-500/20";
  }
};

const getResultIcon = (result: string) => {
  switch (result) {
    case "deliverable":
      return "✅";
    case "risky":
      return "⚠️";
    case "undeliverable":
      return "❌";
    default:
      return "❓";
  }
};

const EmailResultsList = ({ results }: EmailResultsListProps) => {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenItems(newOpen);
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Risultati Dettagliati ({results.length})</h3>
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {results.map((result) => (
            <Collapsible
              key={result.id}
              open={openItems.has(result.id)}
              onOpenChange={() => toggleItem(result.id)}
            >
              <CollapsibleTrigger asChild>
                <Card
                  className={`p-3 cursor-pointer transition-all hover:shadow-md ${getResultColor(
                    result.result
                  )}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg">{getResultIcon(result.result)}</span>
                      <span className="font-mono text-sm truncate">{result.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {result.result}
                      </Badge>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          openItems.has(result.id) ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-1 p-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium">Formato: </span>
                      {result.format_valid ? "✅ Valido" : "❌ Invalido"}
                    </div>
                    <div>
                      <span className="font-medium">Dominio: </span>
                      {result.domain_valid ? "✅ Valido" : "❌ Invalido"}
                    </div>
                    <div>
                      <span className="font-medium">SMTP: </span>
                      {result.smtp_valid ? "✅ Valido" : "❌ Invalido"}
                    </div>
                    <div>
                      <span className="font-medium">Catch-All: </span>
                      {result.catch_all ? "Sì" : "No"}
                    </div>
                    <div>
                      <span className="font-medium">Temporanea: </span>
                      {result.disposable ? "⚠️ Sì" : "✅ No"}
                    </div>
                    <div>
                      <span className="font-medium">Gratuita: </span>
                      {result.free_email ? "Sì" : "No"}
                    </div>
                    {result.reason && (
                      <div className="col-span-2 mt-1 pt-1 border-t border-border">
                        <span className="font-medium">Motivo: </span>
                        <span className="text-muted-foreground">{result.reason}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default EmailResultsList;
