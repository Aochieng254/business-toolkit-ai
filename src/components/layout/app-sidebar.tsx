import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  Receipt,
  Wallet,
  UserSquare2,
  Mail,
  Sparkles,
  Calculator,
  Bot,
  CreditCard,
  ShieldCheck,
  Settings,
  Users,
  Building2,
  FolderOpen,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Brand } from "@/components/brand";

const workspace = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Files", url: "/files", icon: FolderOpen },
  { title: "AI Assistant", url: "/ai-assistant", icon: Bot },
];


const generators = [
  { title: "Invoice", url: "/invoice", icon: FileText },
  { title: "Quotation", url: "/quotation", icon: FileSpreadsheet },
  { title: "Receipt", url: "/receipt", icon: Receipt },
  { title: "Payslip", url: "/payslip", icon: Wallet },
  { title: "CV Builder", url: "/cv-builder", icon: UserSquare2 },
  { title: "Cover Letter", url: "/cover-letter", icon: Mail },
  { title: "Business Name", url: "/business-name-generator", icon: Sparkles },
];

const business = [
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Company profile", url: "/company", icon: Building2 },
];

const tools = [
  { title: "Calculators", url: "/calculators", icon: Calculator },
];

const account = [
  { title: "Subscription", url: "/subscription", icon: CreditCard },
  { title: "Admin", url: "/admin", icon: ShieldCheck },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  const renderGroup = (label: string, items: typeof workspace) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <Link to={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <Brand className="text-sm" />
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Workspace", workspace)}
        {renderGroup("Generators", generators)}
        {renderGroup("Business", business)}
        {renderGroup("Tools", tools)}
        {renderGroup("Account", account)}
      </SidebarContent>
    </Sidebar>
  );
}
