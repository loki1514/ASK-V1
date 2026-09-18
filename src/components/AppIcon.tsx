import React from "react";
import { StyleProp, TextStyle, View, ViewStyle } from "react-native";
import {
  Activity as ActivityIcon,
  ArrowRight,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CircleUserRound,
  Clock,
  Cpu,
  Database,
  Download,
  Ellipsis,
  FileSearch,
  FileText,
  FlaskConical,
  Gauge,
  Handshake,
  HardDrive,
  HeartHandshake,
  KeyRound,
  ListChecks,
  Loader,
  Lock,
  MessageSquare,
  MessagesSquare,
  Mic,
  MicOff,
  PackageCheck,
  Play,
  Pause,
  RefreshCw,
  ScanSearch,
  Search,
  Share2,
  ShieldCheck,
  ShieldLock,
  Settings2,
  Smartphone,
  Sparkles,
  Trash2,
  UserRound,
  Volume2,
  Waves,
  Zap,
} from "lucide-react-native";
import { icon, colors, themes } from "@/theme/tokens";
import { ThemeContext } from "@/lib/themeContext";

export type IconName =
  | "activity"
  | "arrowRight"
  | "bot"
  | "camera"
  | "check"
  | "checkCircle"
  | "chevronDown"
  | "chevronUp"
  | "circleAlert"
  | "circleCheck"
  | "circleUser"
  | "clock"
  | "cpu"
  | "database"
  | "download"
  | "ellipsis"
  | "fileSearch"
  | "fileText"
  | "flask"
  | "gauge"
  | "handshake"
  | "hardDrive"
  | "heartHandshake"
  | "keyRound"
  | "listChecks"
  | "loader"
  | "lock"
  | "messageSquare"
  | "messagesSquare"
  | "mic"
  | "micOff"
  | "packageCheck"
  | "pause"
  | "play"
  | "refresh"
  | "scanSearch"
  | "search"
  | "share"
  | "shieldCheck"
  | "shieldLock"
  | "settings"
  | "smartphone"
  | "sparkles"
  | "trash"
  | "userRound"
  | "volume"
  | "waves"
  | "zap";

export const iconMap: Record<IconName, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  activity: ActivityIcon,
  arrowRight: ArrowRight,
  bot: Bot,
  camera: Camera,
  check: Check,
  checkCircle: CheckCircle2,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  circleAlert: CircleAlert,
  circleCheck: CircleCheck,
  circleUser: CircleUserRound,
  clock: Clock,
  cpu: Cpu,
  database: Database,
  download: Download,
  ellipsis: Ellipsis,
  fileSearch: FileSearch,
  fileText: FileText,
  flask: FlaskConical,
  gauge: Gauge,
  handshake: Handshake,
  hardDrive: HardDrive,
  heartHandshake: HeartHandshake,
  keyRound: KeyRound,
  listChecks: ListChecks,
  loader: Loader,
  lock: Lock,
  messageSquare: MessageSquare,
  messagesSquare: MessagesSquare,
  mic: Mic,
  micOff: MicOff,
  packageCheck: PackageCheck,
  pause: Pause,
  play: Play,
  refresh: RefreshCw,
  scanSearch: ScanSearch,
  search: Search,
  share: Share2,
  shieldCheck: ShieldCheck,
  shieldLock: ShieldLock,
  settings: Settings2,
  smartphone: Smartphone,
  sparkles: Sparkles,
  trash: Trash2,
  userRound: UserRound,
  volume: Volume2,
  waves: Waves,
  zap: Zap,
};

export interface AppIconProps {
  name: IconName;
  size?: keyof typeof icon.sizes | number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  accessible?: boolean;
  accessibilityLabel?: string;
}

export function AppIcon({ name, size = "inline", color, strokeWidth = icon.strokeWidth, style, accessible = true, accessibilityLabel }: AppIconProps) {
  const px = typeof size === "number" ? size : icon.sizes[size];
  const Glyph = iconMap[name];
  const label = accessibilityLabel ?? (name === "loader" ? "Loading" : undefined);
  const ink = color ?? colors.textMuted;
  return (
    <View style={style} accessible={accessible} accessibilityLabel={label} accessibilityRole={accessible ? "image" : undefined}>
      <Glyph size={px} color={ink} strokeWidth={strokeWidth} />
    </View>
  );
}

export function iconSize(name: keyof typeof icon.sizes): number {
  return icon.sizes[name];
}
