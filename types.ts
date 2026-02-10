
export enum PropertyStatus {
  AVAILABLE = 'available',
  RENTED = 'rented',
  SOLD = 'sold',
  RESERVED = 'reserved',
  PAUSED = 'paused',
  MAINTENANCE = 'maint',
  PENDING_REVIEW = 'pending'
}

export type UserRole = 'guest' | 'owner' | 'admin' | 'tenant' | 'marketing' | 'asesor';

export type AdvisorType = 'cerrador' | 'opcionador';

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
  sold_count?: number;
  rented_count?: number;
  advisor_type?: AdvisorType;
}

export interface Document {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf';
  uploadedAt: string;
  uploadedBy: UserRole;
}

export interface SignedDocument {
  id: string;
  property_id: string;
  user_id: string;
  document_type: 'recruitment' | 'keys' | 'contract';
  status: 'pending' | 'signed';
  signature_url?: string;
  pdf_url?: string;
  signed_at?: string;
  created_at: string;
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
  keys_provided?: boolean;
  status_reason?: string;
  referred_by?: string;
  is_submission?: boolean;
  marketing_data?: {
    portals?: {
      name: string;
      url: string;
      status: 'published' | 'pending' | 'rejected';
    }[];
    publication_date?: string;
    extra_notes?: string;
  };
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
  paymentType?: string;

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
  lead_id?: string; // Link to leads_prospectos
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  address?: string; // Property address
  status: 'scheduled' | 'assigned' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  assigned_to?: string; // UUID of the advisor
  feedback?: {
    result: 'no_show' | 'not_interested' | 'considering' | 'paying_investigation' | 'other';
    notes?: string;
    details?: string;
  };
}

export type LeadIntent = 'rent' | 'buy' | 'sell' | 'rent_out';

export type LeadStatus = 'contacting' | 'interested' | 'meeting_doubts' | 'property_loading' | 'property_signing' | 'published' | 'appointment' | 'investigation_paid' | 'investigating' | 'investigation_passed' | 'investigation_failed' | 'ready_to_close' | 'closed_won' | 'closed_lost' | 'archived_potential';

export interface Lead {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  property_id?: string;
  intent: LeadIntent;
  status: LeadStatus;
  assigned_to?: string;
  referred_by?: string;
  payment_proof_url?: string;
  payment_status?: 'pending' | 'under_review' | 'approved' | 'rejected';
  payment_date?: string;
  investigation_notes?: string;
  investigation_link?: string;
  cancellation_reason?: string;
  property_snapshot?: {
    ref?: string;
    title?: string;
    address?: string;
    price?: number;
    type?: 'rent' | 'sale' | 'tokko';
  };
  commission_requested?: boolean;
  commission_amount?: number;
  investigation_score?: string;
  investigation_status?: 'pending' | 'review' | 'approved' | 'rejected';
  archived_at?: string;
  documents_signed?: boolean;
  is_potential?: boolean;
  source?: string;
  operation_type?: 'sale' | 'rent';
  average_price?: number;
  created_at: string;
  updated_at: string;
}

export interface AdvisorProfile {
  user_id: string;
  photo_url?: string;
  is_verified: boolean;
  bio?: string;
  sold_count: number;
  rented_count: number;
  weekly_goal: number;
  total_earnings?: number;
  advisor_type: AdvisorType;
  created_at: string;
  updated_at: string;
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
  status: 'pending' | 'reviewed' | 'approved' | 'rejected' | 'ready_to_close' | 'completed' | 'investigation_passed' | 'archived_potential';
  created_at: string;
  application_type?: 'rent' | 'sale';
  is_bureau_severe?: boolean;
  mortgage_status?: string;
  payment_method?: string;
  assigned_to?: string; // UUID of assigned advisor
  referred_by?: string; // UUID of referring advisor

  // Investigation flow fields (added for parity with Lead)
  payment_proof_url?: string;
  payment_status?: 'pending' | 'under_review' | 'approved' | 'rejected';
  payment_date?: string;
  investigation_score?: string;
  investigation_status?: 'pending' | 'review' | 'approved' | 'rejected';
  archived_at?: string;
  investigation_link?: string;
  documents_signed?: boolean;
  property_snapshot?: {
    ref?: string;
    title?: string;
    address?: string;
    price?: number;
    type?: 'rent' | 'sale' | 'tokko';
  };
  feedback?: {
    result: string;
    notes?: string;
  };
  is_potential?: boolean;
}

export interface TokkoContact {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  mobile?: string;
  tags: { id: number; name: string }[];
  properties: any[];
  search_details?: {
    operation_type?: string;
    property_types?: string[];
    price_from?: number;
    price_to?: number;
  };
  latest_notes?: {
    id: number;
    text: string;
    created_at: string;
  };
  created_at: string;
  updated_at: string;
}
