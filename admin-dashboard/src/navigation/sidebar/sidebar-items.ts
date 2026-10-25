import {
  Calendar,
  CalendarClock,
  Clock,
  FileText,
  Folder,
  Forklift,
  Inbox,
  type LucideIcon,
  Mail,
  ReceiptText,
  ShoppingBag,
  Tag,
  User,
  Users,
  UserX,
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
    label: "Operations",
    items: [
      {
        id: "pav-bookings",
        title: "Bookings",
        url: "/dashboard/bookings",
        icon: Calendar,
      },
      {
        id: "pav-opening-hours",
        title: "Opening Hours",
        url: "/dashboard/opening-hours",
        icon: Clock,
      },
      {
        id: "pav-rota",
        title: "Rota",
        url: "/dashboard/rota",
        icon: CalendarClock,
      },
      {
        id: "pav-submissions",
        title: "Form Submissions",
        url: "/dashboard/submissions",
        icon: Inbox,
      },
    ],
  },
  {
    id: 1,
    label: "Patients & Compliance",
    items: [
      {
        id: "pav-patients",
        title: "Patients",
        url: "/dashboard/patients",
        icon: Users,
      },
      {
        id: "pav-erasure",
        title: "Erasure Requests",
        url: "/dashboard/erasure-requests",
        icon: UserX,
      },
      {
        id: "pav-users",
        title: "Users",
        url: "/dashboard/users",
        icon: User,
      },
    ],
  },
  {
    id: 2,
    label: "Shop & Products",
    items: [
      {
        id: "pav-products",
        title: "Products",
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
    ],
  },
  {
    id: 3,
    label: "Content & Marketing",
    items: [
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
        id: "pav-newsletter",
        title: "Newsletter",
        url: "/dashboard/newsletter",
        icon: Mail,
      },
    ],
  },
];
