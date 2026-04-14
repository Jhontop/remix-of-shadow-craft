import { Shield, Zap, FileVideo, Clock } from "lucide-react";

interface StatsBarProps {
  filesProcessed?: number;
  filesCloaked?: number;
  variationsGenerated?: number;
  avgTime?: number | null;
}

const StatsBar = ({
  filesProcessed = 0,
  filesCloaked = 0,
  variationsGenerated = 0,
  avgTime = null,
}: StatsBarProps) => {
  const stats = [
    { icon: FileVideo, label: "Criativos", value: String(filesProcessed), sub: "este mês" },
    { icon: Shield, label: "Camuflados", value: String(filesCloaked), sub: "com sucesso" },
    { icon: Zap, label: "Variações", value: String(variationsGenerated), sub: "geradas" },
    {
      icon: Clock,
      label: "Tempo médio",
      value: avgTime != null ? `${avgTime}s` : "—",
      sub: "por criativo",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border"
        >
          <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center shrink-0">
            <stat.icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xl font-semibold text-foreground leading-none">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsBar;