import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ValidationList {
  deliverable_count: number;
  undeliverable_count: number;
  risky_count: number;
  unknown_count: number;
  total_emails: number;
}

interface EmailValidationChartProps {
  validationList: ValidationList;
}

const EmailValidationChart = ({ validationList }: EmailValidationChartProps) => {
  const pieData = [
    {
      name: "Deliverable",
      value: validationList.deliverable_count,
      color: "#10b981",
    },
    {
      name: "Risky",
      value: validationList.risky_count,
      color: "#f59e0b",
    },
    {
      name: "Undeliverable",
      value: validationList.undeliverable_count,
      color: "#ef4444",
    },
    {
      name: "Unknown",
      value: validationList.unknown_count,
      color: "#9ca3af",
    },
  ].filter((item) => item.value > 0);

  const validPercentage = Math.round(
    (validationList.deliverable_count / validationList.total_emails) * 100
  );

  const calculatePercentage = (count: number) => {
    return ((count / validationList.total_emails) * 100).toFixed(1);
  };

  return (
    <div className="space-y-4">
      {/* Score Overview */}
      <Card className="p-4 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Tasso di Validità</span>
          <span className="text-2xl font-bold text-emerald-700">{validPercentage}%</span>
        </div>
        <Progress value={validPercentage} className="h-3" />
      </Card>

      {/* Pie Chart */}
      <Card className="p-4">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 bg-emerald-500/5 border-emerald-500/20">
          <div className="text-xs text-muted-foreground mb-1">✅ Deliverable</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              {validationList.deliverable_count}
            </span>
            <span className="text-sm text-muted-foreground">
              {calculatePercentage(validationList.deliverable_count)}%
            </span>
          </div>
        </Card>

        <Card className="p-3 bg-amber-500/5 border-amber-500/20">
          <div className="text-xs text-muted-foreground mb-1">⚠️ Risky</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">
              {validationList.risky_count}
            </span>
            <span className="text-sm text-muted-foreground">
              {calculatePercentage(validationList.risky_count)}%
            </span>
          </div>
        </Card>

        <Card className="p-3 bg-red-500/5 border-red-500/20">
          <div className="text-xs text-muted-foreground mb-1">❌ Undeliverable</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-700">
              {validationList.undeliverable_count}
            </span>
            <span className="text-sm text-muted-foreground">
              {calculatePercentage(validationList.undeliverable_count)}%
            </span>
          </div>
        </Card>

        <Card className="p-3 bg-gray-500/5 border-gray-500/20">
          <div className="text-xs text-muted-foreground mb-1">❓ Unknown</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-700">
              {validationList.unknown_count}
            </span>
            <span className="text-sm text-muted-foreground">
              {calculatePercentage(validationList.unknown_count)}%
            </span>
          </div>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">
          📧 Totale: {validationList.total_emails}
        </Badge>
      </div>
    </div>
  );
};

export default EmailValidationChart;
