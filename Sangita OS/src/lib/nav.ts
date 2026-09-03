import {
  LayoutDashboard,
  Sparkles,
  CalendarClock,
  CheckSquare,
  Target,
  Activity,
  Users,
  GitBranch,
  Mail,
  MessageCircle,
  PhoneCall,
  Video,
  Calendar,
  Wallet,
  FileText,
  FileCheck2,
  FileSignature,
  PenTool,
  FolderKanban,
  UserCircle2,
  Brain,
  BarChart3,
  TrendingUp,
  Bell,
  Settings,
  Package,
  Rocket,
  Cpu,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "CEO Dashboard", to: "/", icon: LayoutDashboard },
      { title: "AI Command Center", to: "/ai-command", icon: Sparkles, badge: "AI" },
      { title: "AI Insights", to: "/ai-insights", icon: Brain },
      { title: "My Future", to: "/my-future", icon: Rocket, badge: "AI" },
    ],
  },
  {
    label: "Daily OS",
    items: [
      { title: "Daily Planner", to: "/planner", icon: CalendarClock },
      { title: "Tasks", to: "/tasks", icon: CheckSquare },
      { title: "Habits", to: "/habits", icon: Target },
      { title: "Activity", to: "/activity", icon: Activity },
    ],
  },
  {
    label: "Revenue",
    items: [
      { title: "CRM", to: "/crm", icon: Users },
      { title: "Lead Pipeline", to: "/leads", icon: GitBranch, badge: "8" },
      { title: "Bulk Email", to: "/email", icon: Mail },
      { title: "WhatsApp", to: "/whatsapp", icon: MessageCircle },
      { title: "Call Logs", to: "/calls", icon: PhoneCall },
      { title: "Meetings", to: "/meetings", icon: Video },
      { title: "Calendar", to: "/calendar", icon: Calendar },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Finance", to: "/finance", icon: Wallet },
      { title: "Invoices", to: "/invoices", icon: FileText },
      { title: "Quotations", to: "/quotations", icon: FileCheck2 },
      { title: "Agreements", to: "/agreements", icon: FileSignature, badge: "New" },
      { title: "Signatures", to: "/signatures", icon: PenTool },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Projects", to: "/projects", icon: FolderKanban },
      { title: "Employees", to: "/employees", icon: UserCircle2 },
      { title: "Products", to: "/products", icon: Package },
      { title: "Reports", to: "/reports", icon: BarChart3 },
      { title: "Forecast", to: "/forecast", icon: TrendingUp },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Notifications", to: "/notifications", icon: Bell, badge: "3" },
      { title: "Keyword Intelligence", to: "/keyword-intelligence", icon: Cpu, badge: "AI" },
      { title: "Settings", to: "/settings", icon: Settings },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);
