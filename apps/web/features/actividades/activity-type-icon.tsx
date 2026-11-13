import { ClipboardList, Mail, Phone, Video } from "lucide-react";
import type { ActivityType } from "@wave/shared";

export function ActivityTypeIcon({ type }: { type: ActivityType }) {
  const Icon = type === "CALL" ? Phone : type === "EMAIL" ? Mail : type === "MEETING" ? Video : ClipboardList;
  return <Icon aria-hidden className="activity-kind-icon" />;
}
