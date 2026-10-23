import {
  Banknote,
  Calendar,
  ChartBar,
  CheckSquare,
  FileText,
  Fingerprint,
  Folder,
  FolderOpen,
  Forklift,
  Gauge,
  GraduationCap,
  HeartPulse,
  Inbox,
  Kanban,
  LayoutDashboard,
  ListTodo,
  Lock,
  type LucideIcon,
  Mail,
  MessageSquare,
  ReceiptText,
  Server,
  ShoppingBag,
  SquareArrowUpRight,
  Tag,
  User,
  UserRound,
  Users,
} from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 0,
    label: "PavDental",
    items: [
      {
        id: "pav-bookings",
        title: "Bookings",
        url: "/dashboard/bookings",
        icon: Calendar,
      },
      {
        id: "pav-patients",
        title: "Patients",
        url: "/dashboard/patients",
        icon: Users,
      },
      {
        id: "pav-users",
        title: "Users",
        url: "/dashboard/users",
        icon: User,
      },
      {
        id: "pav-products",
        title: "Shop Products",
        url: "/dashboard/products",
        icon: ShoppingBag,
      },
      {
        id: "pav-categories",
        title: "Categories",
        url: "/dashboard/categories",
        icon: Folder,
      },
      {
        id: "pav-orders",
        title: "Orders",
        url: "/dashboard/orders",
        icon: ReceiptText,
      },
      {
        id: "pav-discounts",
        title: "Discounts",
        url: "/dashboard/discounts",
        icon: Tag,
      },
      {
        id: "pav-shipping",
        title: "Shipping",
        url: "/dashboard/shipping",
        icon: Forklift,
      },
      {
        id: "pav-blogs",
        title: "Blog Posts",
        url: "/dashboard/blogs",
        icon: FileText,
      },
      {
        id: "pav-pricing",
        title: "Pricing Editor",
        url: "/dashboard/pricing",
        icon: Tag,
      },
      {
        id: "pav-submissions",
        title: "Form Submissions",
        url: "/dashboard/submissions",
        icon: Inbox,
      },
      {
        id: "pav-newsletter",
        title: "Newsletter",
        url: "/dashboard/newsletter",
        icon: Mail,
      },
    ],
  },
  {
    id: 1,
    label: "Dashboards",
    items: [
      {
        id: "default",
        title: "Default",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        id: "crm",
        title: "CRM",
        url: "/dashboard/crm",
        icon: ChartBar,
      },
      {
        id: "finance",
        title: "Finance",
        url: "/dashboard/finance",
        icon: Banknote,
      },
      {
        id: "analytics",
        title: "Analytics",
        url: "/dashboard/analytics",
        icon: Gauge,
      },
      {
        id: "productivity",
        title: "Productivity",
        url: "/dashboard/productivity",
        icon: ListTodo,
      },
      {
        id: "ecommerce",
        title: "E-commerce",
        url: "/dashboard/ecommerce",
        icon: ShoppingBag,
      },
      {
        id: "academy",
        title: "Academy",
        url: "/dashboard/academy",
        icon: GraduationCap,
      },
      {
        id: "logistics",
        title: "Logistics",
        url: "/dashboard/logistics",
        icon: Server,
        badge: "soon",
        disabled: true,
      },
      {
        id: "infrastructure",
        title: "Infrastructure",
        url: "/dashboard/infrastructure",
        icon: Server,
        badge: "soon",
        disabled: true,
      },
      {
        id: "file-manager",
        title: "File Manager",
        url: "/dashboard/file-manager",
        icon: FolderOpen,
      },
      {
        id: "patient-monitoring",
        title: "Patient Monitoring",
        url: "/dashboard/patient-monitoring",
        icon: HeartPulse,
      },
    ],
  },
  {
    id: 2,
    label: "Pages",
    items: [
      {
        id: "email",
        title: "Email",
        url: "/dashboard/mail",
        icon: Mail,
      },
      {
        id: "chat",
        title: "Chat",
        url: "/dashboard/chat",
        icon: MessageSquare,
      },
      {
        id: "calendar",
        title: "Calendar",
        url: "/dashboard/calendar",
        icon: Calendar,
      },
      {
        id: "kanban",
        title: "Kanban",
        url: "/dashboard/kanban",
        icon: Kanban,
      },
      {
        id: "tasks",
        title: "Tasks",
        url: "/dashboard/tasks",
        icon: CheckSquare,
      },
      {
        id: "invoice",
        title: "Invoice",
        url: "/dashboard/invoice",
        icon: ReceiptText,
      },
      {
        id: "profile",
        title: "Profile",
        url: "/dashboard/profile",
        icon: UserRound,
      },
      {
        id: "roles",
        title: "Roles",
        url: "/dashboard/roles",
        icon: Lock,
      },
      {
        id: "authentication",
        title: "Authentication",
        icon: Fingerprint,
        subItems: [
          { id: "auth-login-v1", title: "Login v1", url: "/auth/v1/login", newTab: true },
          { id: "auth-login-v2", title: "Login v2", url: "/auth/v2/login", newTab: true },
          { id: "auth-register-v1", title: "Register v1", url: "/auth/v1/register", newTab: true },
          { id: "auth-register-v2", title: "Register v2", url: "/auth/v2/register", newTab: true },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "Legacy",
    items: [
      {
        id: "legacy-dashboards",
        title: "Dashboards",
        subItems: [
          { id: "legacy-default", title: "Default V1", url: "/dashboard/default-v1" },
          { id: "legacy-crm", title: "CRM V1", url: "/dashboard/crm-v1" },
          { id: "legacy-finance", title: "Finance V1", url: "/dashboard/finance-v1" },
          { id: "legacy-analytics", title: "Analytics V1", url: "/dashboard/analytics-v1" },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "Misc",
    items: [
      {
        id: "others",
        title: "Others",
        url: "/dashboard/coming-soon",
        icon: SquareArrowUpRight,
        badge: "soon",
        disabled: true,
      },
    ],
  },
];
