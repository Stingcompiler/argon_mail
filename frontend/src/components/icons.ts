import {
  Award, Banknote, Briefcase, Building2, CalendarDays, Camera, Car, CreditCard, FileText, Globe, GraduationCap,
  HeartPulse, House, IdCard, Landmark, Languages, Laptop, LayoutGrid, Mail, MapPin, Package, Phone, Plane,
  Printer, Scale, ShoppingBag, Smartphone, Stamp, Truck, Wrench, type LucideIcon,
} from 'lucide-react';

/** Icons offered for services and categories. Keys must match ICON_KEYS in
 * apps/catalog/models.py; labels name them for the dashboard picker. */
export const serviceIcons: Record<string, LucideIcon> = {
  package: Package, education: GraduationCap, travel: Plane, document: FileText, government: Landmark,
  digital: Smartphone, mail: Mail, id: IdCard, money: Banknote, health: HeartPulse, car: Car, home: House,
  work: Briefcase, legal: Scale, translate: Languages, print: Printer, certificate: Award, payment: CreditCard,
  shopping: ShoppingBag, phone: Phone, globe: Globe, camera: Camera, calendar: CalendarDays, location: MapPin,
  tools: Wrench, laptop: Laptop, stamp: Stamp, company: Building2, delivery: Truck, other: LayoutGrid,
};

export const iconLabels: Record<string, string> = {
  package: 'طرود', education: 'تعليم', travel: 'سفر', document: 'مستندات', government: 'خدمات حكومية',
  digital: 'خدمات رقمية', mail: 'بريد', id: 'هوية', money: 'أموال', health: 'صحة', car: 'مركبات', home: 'سكن',
  work: 'عمل', legal: 'قانوني', translate: 'ترجمة', print: 'طباعة', certificate: 'شهادات', payment: 'دفع',
  shopping: 'تسوق', phone: 'اتصالات', globe: 'دولي', camera: 'تصوير', calendar: 'مواعيد', location: 'موقع',
  tools: 'صيانة', laptop: 'حاسوب', stamp: 'توثيق', company: 'شركات', delivery: 'توصيل', other: 'أخرى',
};

export const iconFor = (key: string) => serviceIcons[key] || Package;
