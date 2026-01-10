
export enum PropertyStatus {
  AVAILABLE = 'available',
  RENTED = 'rented',
  SOLD = 'sold',
  MAINTENANCE = 'maint',
  PENDING_REVIEW = 'pending'
}

export type UserRole = 'guest' | 'owner' | 'admin' | 'tenant';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  propertyId?: string;
  personalInfo?: {
    origin?: string;
    nationality?: string;
    age?: number;
    dob?: string;
    occupation?: string;
    phone?: string;
    homeAddress?: string;
    legalStatus?: 'owner' | 'admin' | 'other';
  };
  // Client Panel Specific Fields
  propertyCode?: string;
  depositDay?: string;
  monthlyAmount?: number;
  contractEndDate?: string;
  contractStartDate?: string;
  propertyTitle?: string;
  propertyAddress?: string;
  linkedName?: string; // Tenant name for owners, or Owner name for tenants
  phoneContact?: string;
  vouchers?: string[];
}

export interface Document {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf';
  uploadedAt: string;
  uploadedBy: UserRole;
}

export interface Property {
  id: string;
  tokkoId?: string;
  ref: string;
  title: string;
  address: string;
  status: PropertyStatus;
  price: number;
  type: 'rent' | 'sale';
  maintenanceFee: number;
  isFeatured?: boolean;
  specs: {
    beds: number;
    baths: number;
    halfBaths?: number;
    parking: number;
    area: number; // Construction area
    landArea?: number;
    age?: number;
    levels?: number;
    condition?: string;
    furnished?: boolean;
    pets?: boolean;
    isVacant?: boolean;
    hasDiningRoom?: boolean;
    hasLivingRoom?: boolean;
    hasTVRoom?: boolean;
    commonAreas?: number;
  };
  description: string;
  mainImage?: string;
  images: string[];
  accessCode: string;
  ownerId?: string;
  ownerName?: string;
  tenantName?: string;
  tenantId?: string;
  contractEndDate?: string;
  documents: Document[];
  features?: string[]; // General or Legacy
  services: string[]; // e.g., Water, Electricity, Gas
  amenities: string[]; // e.g., Pool, Gym, Security
  spaces: string[]; // e.g., Kitchen, Patio, Terrace
  additionals?: string[]; // e.g., AC, Alarm
  isFreeOfEncumbrance?: boolean;
  // Location fields for MapBox integration
  latitude?: number;
  longitude?: number;
  fullAddress?: string;
  isInternal?: boolean;
}


export interface TimelineEvent {
  id: string;
  propertyId?: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  status: 'pending' | 'in-progress' | 'completed';
}

export interface PaymentProof {
  id: string;
  userId: string;
  propertyId: string;
  monthYear: string; // YYYY-MM
  amount: number;
  proofUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  userName?: string; // For Admin UI
  propertyRef?: string; // For Admin UI
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type BlogBlockType = 'text' | 'h1' | 'h2' | 'h3' | 'image' | 'video' | 'youtube' | 'list' | 'table' | 'blog_ref' | 'external_link';

export interface BlogBlock {
  id: string;
  type: BlogBlockType;
  content: any; // Based on type
}

export interface BlogPost {
  id: string;
  author_id?: string;
  title: string;
  slug: string;
  excerpt?: string;
  main_image: string;
  content: BlogBlock[];
  status: 'draft' | 'published';
  category?: string;
  created_at: string;
  updated_at: string;
}


export interface Report {
  id: string;
  userId: string;
  propertyId?: string;
  reportType: 'property' | 'person' | 'other';
  title: string;
  description: string;
  imageUrls?: string[];
  status: 'pending' | 'in_progress' | 'resolved';
  createdAt: string;
  updatedAt: string;
  // Joined data
  userName?: string;
  propertyAddress?: string;
}

export interface Appraisal {
  id: string;
  firstName: string;
  lastName1: string;
  lastName2: string;
  propertyType: 'casa' | 'departamento';
  location: string;
  constArea: number;
  landArea: number;
  beds: number;
  baths: number;
  age: number;
  furnishing: 'none' | 'semi' | 'full';
  amenities: string[];
  services: string[];
  status: 'pending' | 'reviewed' | 'completed';
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'appraisal' | 'payment' | 'report';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Appointment {
  id: string;
  property_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
}

export interface RentalApplication {
  id: string;
  property_id: string;
  property_ref: string;
  full_name: string;
  phone: string;
  email: string;
  adults: number;
  children: number;
  has_pets: boolean;
  knows_area: boolean;
  reason: string;
  move_date: string;
  duration: string;
  income_source: string;
  meets_ratio: boolean;
  bureau_status: string;
  appointment_date: string;
  appointment_time: string;
  accepted_requirements: boolean;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  created_at: string;
  application_type?: 'rent' | 'sale';
  is_bureau_severe?: boolean;
  mortgage_status?: string;
  payment_method?: string;
}
