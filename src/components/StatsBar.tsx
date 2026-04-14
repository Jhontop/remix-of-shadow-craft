import { Shield, Zap, FileVideo, Clock } from "lucide-react";

interface Stat {
  icon: typeof Shield;
  label: string;
  value: string;
  sub?: string;
}

const stats: Stat[] = [
  { icon: FileVideo, label: "Criativos", value: "0", sub: "este mês" },
  { icon: Shield, label: "Camuflados", value: "0", sub: "com sucesso" },
  { icon: Zap, label: "Variações", value: "0", sub: "geradas" },
  { icon: Clock, label: "Tempo médio", value: "—", sub: "por criativo" },
];

const StatsBar = () => (
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

export default StatsBar;
