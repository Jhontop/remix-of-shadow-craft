import { Shield, Upload, Settings, BarChart3, FolderOpen, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "upload", icon: Upload, label: "Upload" },
  { id: "projects", icon: FolderOpen, label: "Projetos" },
  { id: "processing", icon: Zap, label: "Processamento" },
  
  { id: "analytics", icon: BarChart3, label: "Analytics" },
  { id: "settings", icon: Settings, label: "Configurações" },
];

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  return (
    <aside className="w-[72px] h-screen bg-card border-r border-border flex flex-col items-center py-6 gap-2 shrink-0">
      <div className="mb-6 flex items-center justify-center w-10 h-10 rounded-lg gradient-primary glow-sm">
        <Shield className="w-5 h-5 text-primary-foreground" />
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group relative",
              activeTab === item.id
                ? "bg-primary/10 text-primary glow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 rounded-md bg-card border border-border text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
