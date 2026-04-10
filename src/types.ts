export type Neighborhood = "Plateau" | "Almadies" | "Ouest Foire" | "VDN" | "Parcelles" | "Mermoz" | "Fann" | "Sacré-Cœur" | "Ngor" | "Yoff";
export type PropertyType = "Chambre étudiant" | "Appartement" | "Villa" | "Logement Entier";
export type StayType = "Location Courte Durée" | "Location Longue Durée";
export type UserRole = "user" | "courtier" | "aide_courtier" | "admin";
export type PaymentStatus = "En attente" | "Validé";

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL?: string;
  role: UserRole;
  country?: string; // Country of residence
  favorites: string[]; // Array of listing IDs
  phone?: string;
  affiliateClicks?: number;
  balance?: number;
  transactions?: Transaction[];
  isBlocked?: boolean;
  brokerId?: string; // For Aide-Courtier, link to their Courtier
  createdAt: string;
  // Premium Profile Fields
  plan?: "Gratuit" | "Prestige" | "Agence";
  coverImage?: string;
  agencyLogo?: string;
  agencyDescription?: string;
  isGoldVerified?: boolean;
}

export type ListingStatus = "Disponible" | "Loué" | "Bloqué";

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  neighborhood: Neighborhood;
  type: PropertyType;
  whatsapp: string;
  images: string[]; // Max 6
  videos: string[]; // Max 2
  courtierId: string;
  createdAt: any;
  isBoosted?: boolean;
  boostUntil?: string; // ISO date string
  visitFee?: number;
  tags?: string[];
  proximity?: string[];
  isVerified?: boolean;
  stayType?: StayType;
  lat?: number;
  lng?: number;
  commissionAideCourtier?: number;
  status?: ListingStatus;
  isAgentCertified?: boolean;
  isVisitedByTeam?: boolean;
  isExclusive?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  courtierName?: string;
  courtierPhoto?: string;
  views?: number;
  favoritesCount?: number;
}

export interface AffiliateClick {
  id: string;
  listingId: string;
  affiliateId: string;
  createdAt: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning";
  read: boolean;
  createdAt: any;
  listingId?: string; // Optional listing ID for context
}

export interface CommissionClaim {
  id: string;
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  listingId: string;
  listingTitle: string;
  clientName?: string;
  promisedCommission: number;
  status: "En attente" | "Validé" | "Rejeté";
  createdAt: any;
  courtierId?: string;
  courtierName?: string;
  proofImageUrl?: string;
  type?: 'claim' | 'declaration';
}

export interface Review {
  id: string;
  courtierId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: any;
}

export interface ServiceRequest {
  id: string;
  userId: string;
  userEmail: string;
  serviceType: "Badge VÉRIFIÉ" | "BOOST Semaine" | "BOOST Mois" | "PACK Agence";
  price: number;
  status: PaymentStatus;
  listingId?: string; // Optional if it's for a specific listing
  createdAt: any;
}

export interface ColocationMessage {
  id: string;
  listingId: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: any;
}

export type TransactionType = "commission" | "withdrawal" | "purchase";
export type TransactionStatus = "completed" | "pending" | "rejected";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  status: TransactionStatus;
  createdAt: any;
}

export interface HousingRequest {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  neighborhood: Neighborhood;
  type: PropertyType;
  budget: number;
  description: string;
  whatsapp: string;
  createdAt: any;
  status: "Ouvert" | "Fermé";
}

export interface LeadTransfer {
  id: string;
  listingId: string;
  listingTitle: string;
  affiliateId: string;
  affiliateName: string;
  courtierId: string;
  courtierName: string;
  clientName?: string;
  createdAt: any;
  status?: 'En cours' | 'Vente Réussie' | 'Litige';
}

export const NEIGHBORHOODS: Neighborhood[] = [
  "Plateau", "Almadies", "Ouest Foire", "VDN", "Parcelles", "Mermoz", "Fann", "Sacré-Cœur", "Ngor", "Yoff"
];

export const PROPERTY_TYPES: PropertyType[] = [
  "Chambre étudiant", "Appartement", "Villa", "Logement Entier"
];

export const STAY_TYPES: StayType[] = [
  "Location Courte Durée", "Location Longue Durée"
];

export const PROXIMITY_ZONES = [
  "UCAD", "ISM", "BEM", "IAM", "Zone Industrielle", "Centre-ville", "Aéroport", "Plage"
];

export const AMENITY_TAGS = [
  "Eau comprise", "Électricité prépayée (Woyofal)", "Gardien", "Balcon", "Parking", "Climatisation"
];

export interface Country {
  name: string;
  code: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  // Africa
  { name: "Sénégal", code: "SN", flag: "🇸🇳" },
  { name: "Mali", code: "ML", flag: "🇲🇱" },
  { name: "Côte d'Ivoire", code: "CI", flag: "🇨🇮" },
  { name: "Guinée", code: "GN", flag: "🇬🇳" },
  { name: "Burkina Faso", code: "BF", flag: "🇧🇫" },
  { name: "Bénin", code: "BJ", flag: "🇧🇯" },
  { name: "Togo", code: "TG", flag: "🇹🇬" },
  { name: "Niger", code: "NE", flag: "🇳🇪" },
  { name: "Cameroun", code: "CM", flag: "🇨🇲" },
  { name: "Gabon", code: "GA", flag: "🇬🇦" },
  { name: "Congo", code: "CG", flag: "🇨🇬" },
  { name: "RD Congo", code: "CD", flag: "🇨🇩" },
  { name: "Maroc", code: "MA", flag: "🇲🇦" },
  { name: "Algérie", code: "DZ", flag: "🇩🇿" },
  { name: "Tunisie", code: "TN", flag: "🇹🇳" },
  { name: "Mauritanie", code: "MR", flag: "🇲🇷" },
  { name: "Nigeria", code: "NG", flag: "🇳🇬" },
  { name: "Ghana", code: "GH", flag: "🇬🇭" },
  { name: "Afrique du Sud", code: "ZA", flag: "🇿🇦" },
  { name: "Égypte", code: "EG", flag: "🇪🇬" },
  { name: "Éthiopie", code: "ET", flag: "🇪🇹" },
  { name: "Kenya", code: "KE", flag: "🇰🇪" },
  { name: "Rwanda", code: "RW", flag: "🇷🇼" },
  { name: "Tchad", code: "TD", flag: "🇹🇩" },
  { name: "Madagascar", code: "MG", flag: "🇲🇬" },
  { name: "Angola", code: "AO", flag: "🇦🇴" },
  { name: "Gambie", code: "GM", flag: "🇬🇲" },
  { name: "Libéria", code: "LR", flag: "🇱🇷" },
  { name: "Sierra Leone", code: "SL", flag: "🇸🇱" },
  { name: "Guinée-Bissau", code: "GW", flag: "🇬🇼" },
  { name: "Cap-Vert", code: "CV", flag: "🇨🇻" },
  // Europe
  { name: "France", code: "FR", flag: "🇫🇷" },
  { name: "Belgique", code: "BE", flag: "🇧🇪" },
  { name: "Suisse", code: "CH", flag: "🇨🇭" },
  { name: "Espagne", code: "ES", flag: "🇪🇸" },
  { name: "Italie", code: "IT", flag: "🇮🇹" },
  { name: "Allemagne", code: "DE", flag: "🇩🇪" },
  { name: "Royaume-Uni", code: "GB", flag: "🇬🇧" },
  { name: "Portugal", code: "PT", flag: "🇵🇹" },
  { name: "Luxembourg", code: "LU", flag: "🇱🇺" },
  { name: "Pays-Bas", code: "NL", flag: "🇳🇱" },
  { name: "Autriche", code: "AT", flag: "🇦🇹" },
  { name: "Suède", code: "SE", flag: "🇸🇪" },
  { name: "Norvège", code: "NO", flag: "🇳🇴" },
  { name: "Danemark", code: "DK", flag: "🇩🇰" },
  { name: "Finlande", code: "FI", flag: "🇫🇮" },
  { name: "Irlande", code: "IE", flag: "🇮🇪" },
  { name: "Grèce", code: "GR", flag: "🇬🇷" },
  { name: "Pologne", code: "PL", flag: "🇵🇱" },
  { name: "Roumanie", code: "RO", flag: "🇷🇴" },
  { name: "Turquie", code: "TR", flag: "🇹🇷" },
];
