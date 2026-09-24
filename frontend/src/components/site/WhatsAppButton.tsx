import { MessageCircle } from 'lucide-react';

/** Opens a WhatsApp chat; nothing is sent automatically. Hidden until the
 * platform number is configured in settings. */
export function WhatsAppButton({ url }: { url: string }) {
  if (!url) return null;
  return (
    <a className="whatsapp" href={url} target="_blank" rel="noopener noreferrer" aria-label="التواصل عبر واتساب">
      <MessageCircle size={26} />
    </a>
  );
}
