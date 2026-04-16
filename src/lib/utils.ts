import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(price);
}

export function getWhatsAppLink(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function timeAgo(date: Date | undefined): string {
  if (!date) return 'À l\'instant';
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `Il y a ${diffInSeconds}s`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Il y a ${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Il y a ${diffInHours}h`;
  const diffInHoursFromDays = Math.floor(diffInHours / 24);
  if (diffInHoursFromDays < 7) return `Il y a ${diffInHoursFromDays}j`;
  return date.toLocaleDateString('fr-FR');
}

export function safeDispatchEvent(name: string, detail?: any) {
  try {
    // Try standard constructor first
    const event = new CustomEvent(name, { detail, bubbles: true, cancelable: true });
    window.dispatchEvent(event);
  } catch (e) {
    // Fallback for environments where new CustomEvent() is an "Illegal constructor"
    try {
      const event = document.createEvent('CustomEvent');
      event.initCustomEvent(name, true, true, detail);
      window.dispatchEvent(event);
    } catch (err) {
      console.error(`Failed to dispatch event ${name}:`, err);
    }
  }
}
