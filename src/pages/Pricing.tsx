
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Plan {
  id: string;
  name: string;
  monthly_price: number;
  monthly_email_limit: number;
  validation_limit: number;
  monthly_search_limit?: number;
  features: string[];
}

// Fallback data in case DB fetch fails
const FALLBACK_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    monthly_price: 0,
    monthly_email_limit: 5000,
    validation_limit: 5000,
    monthly_search_limit: 100,
    features: ["Validazione base", "Export CSV/XLSX"]
  },
  {
    id: 'basic',
    name: 'Basic',
    monthly_price: 9.9,
    monthly_email_limit: 10000,
    validation_limit: 10000,
    monthly_search_limit: 250,
    features: ["Validazione avanzata", "Export CSV/XLSX/JSON", "Supporto prioritario"]
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly_price: 19.9,
    monthly_email_limit: 25000,
    validation_limit: 25000,
    monthly_search_limit: 500,
    features: ["Validazione avanzata", "Tutti i formati export", "Accesso API", "Supporto prioritario"]
  },
  {
    id: 'elite',
    name: 'Elite',
    monthly_price: 29.9,
    monthly_email_limit: 100000,
    validation_limit: 100000,
    monthly_search_limit: 1000,
    features: ["Validazione avanzata", "Tutti i formati export", "Accesso API", "Supporto dedicato", "Integrazione custom"]
  },
  {
    id: 'vip',
    name: 'VIP',
    monthly_price: 49.9,
    monthly_email_limit: 500000,
    validation_limit: 500000,
    monthly_search_limit: 50000,
    features: ["Validazione avanzata", "Tutti i formati export", "Accesso API completo", "Supporto dedicato", "Integrazione custom"]
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    monthly_price: 99.9,
    monthly_email_limit: -1,
    validation_limit: -1,
    monthly_search_limit: -1,
    features: ["Tutto illimitato", "Validazione avanzata", "Tutti i formati export", "Accesso API completo", "Supporto dedicato", "Integrazione custom"]
  }
];

export default function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
    fetchCurrentPlan();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('monthly_price', { ascending: true });

      if (error) {
        console.warn('Could not fetch plans from DB, using fallback:', error);
        setPlans(FALLBACK_PLANS);
      } else if (data && data.length > 0) {
        setPlans(data);
      } else {
        setPlans(FALLBACK_PLANS);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      setPlans(FALLBACK_PLANS);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPlan = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('plan_id')
      .eq('id', user.id)
      .single();

    if (data) {
      setCurrentPlanId(data.plan_id);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setUpgrading(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      // In a real application, this would redirect to a payment processor (Stripe, etc.)
      // For this demo, we'll directly update the user's plan
      const { error } = await supabase
        .from('profiles')
        .update({ 
          plan_id: planId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setCurrentPlanId(planId);
      toast({
        title: "Successo!",
        description: "Il tuo piano è stato aggiornato con successo.",
      });
      
      // Refresh the page or state to reflect changes
      window.location.reload();
      
    } catch (error) {
      console.error('Error upgrading plan:', error);
      toast({
        title: "Upgrade Fallito",
        description: "Impossibile aggiornare il piano. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Prezzi Semplici e Trasparenti</h1>
        <p className="text-xl text-muted-foreground">
          Scegli il piano più adatto alle tue esigenze. Fai upgrade o downgrade in qualsiasi momento.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlanId === plan.id;
          const isFree = plan.monthly_price === 0;

          return (
            <Card key={plan.id} className={`flex flex-col ${isCurrentPlan ? 'border-primary shadow-lg scale-105' : ''}`}>
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">
                    {isFree ? 'Gratis' : `€${plan.monthly_price}`}
                  </span>
                  {!isFree && <span className="text-muted-foreground">/mese</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm">
                      {plan.monthly_search_limit === -1 
                        ? "Ricerche illimitate" 
                        : `${plan.monthly_search_limit?.toLocaleString() || 0} ricerche/mese`}
                    </span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm">
                      {plan.validation_limit === -1 
                        ? "Validazioni email illimitate" 
                        : `Fino a ${plan.validation_limit.toLocaleString()} validazioni email/mese`}
                    </span>
                  </li>
                  {/* Parse features if they are stored as JSON string or array */}
                  {(typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features).map((feature: string, i: number) => (
                    <li key={i} className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={isCurrentPlan ? "outline" : "default"}
                  disabled={isCurrentPlan || upgrading === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {upgrading === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isCurrentPlan ? "Piano Attuale" : "Passa a questo piano"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
