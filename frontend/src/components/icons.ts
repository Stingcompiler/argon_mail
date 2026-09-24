import { FileText, GraduationCap, Package, Plane, type LucideIcon } from 'lucide-react';

export const serviceIcons: Record<string, LucideIcon> = {
  package: Package, education: GraduationCap, travel: Plane, document: FileText,
};
export const iconFor = (key: string) => serviceIcons[key] || Package;
