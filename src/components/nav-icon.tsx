import {
  Home,
  MessageCircle,
  Shield,
  ShieldAlert,
  Search,
  Mail,
  Building,
  ClipboardList,
  Link2,
  Camera,
  FileText,
  Calendar,
  BookOpen,
  Scale,
  Users,
  Key,
  Inbox,
  Receipt,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type { NavIcon as NavIconName } from "@/lib/data";

const ICON_MAP: Record<NavIconName, LucideIcon> = {
  home: Home,
  "message-circle": MessageCircle,
  shield: Shield,
  "shield-alert": ShieldAlert,
  search: Search,
  mail: Mail,
  building: Building,
  "clipboard-list": ClipboardList,
  link2: Link2,
  camera: Camera,
  "file-text": FileText,
  calendar: Calendar,
  "book-open": BookOpen,
  scale: Scale,
  users: Users,
  key: Key,
  inbox: Inbox,
  receipt: Receipt,
  "alert-triangle": AlertTriangle,
};

export function NavIcon({
  name,
  size = 16,
  className,
}: {
  name: NavIconName;
  size?: number;
  className?: string;
}) {
  const Icon = ICON_MAP[name];
  return <Icon size={size} className={className} aria-hidden />;
}
