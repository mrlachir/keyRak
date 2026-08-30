export type UUID = string;
export type UserRole = "CLIENT" | "ADMIN";
export type PropertyType = "VILLA" | "APARTMENT" | "HOUSE";
export type PropertyMediaType = "IMAGE" | "VIDEO" | "IMAGE_360";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
export type PaymentMethod = "CREDIT_CARD" | "CASH_ON_ARRIVAL";
export type SearchMode = "standard" | "ai";

export interface User {
  id: UUID;
  googleSubject?: string | null;
  email: string;
  displayName?: string | null;
  telephone?: string | null;
  idCardUrl?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileResponse {
  id: UUID;
  email: string;
  displayName?: string | null;
  telephone?: string | null;
  idCardUrl?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
}

export interface Tag {
  id: number;
  name: string;
  icon?: string | null;
}

export interface PropertyMedia {
  id: UUID;
  url: string;
  type: PropertyMediaType;
  displayOrder: number;
  createdAt: string;
}

export interface Property {
  id: UUID;
  title: string;
  description?: string | null;
  propertyType: PropertyType;
  address: string;
  city: string;
  pricePerNight: number;
  latitude: number;
  longitude: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  active: boolean;
  isFeatured: boolean;
  media: PropertyMedia[];
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: UUID;
  userId: UUID;
  propertyId: UUID;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  specialRequests?: string | null;
  totalPrice: number;
  status: BookingStatus;
  paymentMethod?: PaymentMethod | null;
  cancellationRequested: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDashboardMetrics {
  totalActiveProperties: number;
  pendingBookingRequests: number;
  estimatedRevenue: number;
  totalRevenue: number;
  upcomingCash: number;
}

export interface AdminUser {
  id: UUID;
  displayName?: string | null;
  email: string;
  telephone?: string | null;
  role: UserRole;
  createdAt: string;
}

export interface AdminBooking {
  id: UUID;
  propertyId: UUID;
  propertyTitle: string;
  userId: UUID;
  guestName?: string | null;
  guestEmail: string;
  guestTelephone?: string | null;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  specialRequests?: string | null;
  totalPrice: number;
  status: BookingStatus;
  paymentMethod?: PaymentMethod | null;
  guestHasIdCard: boolean;
  paymentCompleted: boolean;
  cancellationRequested: boolean;
  createdAt: string;
  updatedAt: string;
  property: Property;
}

export interface AdminReview {
  id: UUID;
  authorId: UUID;
  authorName?: string | null;
  authorEmail: string;
  authorTelephone?: string | null;
  authorAvatarUrl?: string | null;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  property: Property;
}

export interface Trip {
  id: UUID;
  propertyId: UUID;
  propertyTitle: string;
  propertyCity: string;
  propertyImageUrl?: string | null;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  totalPrice: number;
  status: BookingStatus;
  paymentMethod?: PaymentMethod | null;
  cancellationRequested: boolean;
  createdAt: string;
}

export interface PropertyCardData {
  id: UUID;
  title: string;
  location: string;
  pricePerNight: number;
  rating: number;
  imageUrl: string;
  imageAlt: string;
  guests: number;
  bedrooms: number;
  tags: string[];
  propertyType: PropertyType;
}

export interface AiSearchFilters {
  keyword: string | null;
  location: string | null;
  tags: string[] | null;
  minPrice: number | null;
  maxPrice: number | null;
  guests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  checkInDate: string | null;
  checkOutDate: string | null;
}

export interface PropertySearchFilters {
  keyword?: string;
  location?: string;
  guests?: number | null;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  tags?: string[];
  checkInDate?: string;
  checkOutDate?: string;
}

export interface UpdateUserProfileRequest {
  fullName: string;
  telephone: string;
}

export interface AiDescriptionRequest {
  title: string;
  propertyType: PropertyType;
  city: string;
  address?: string | null;
  pricePerNight?: number | null;
  maxGuests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: string[];
}

export interface AiDescriptionResponse {
  description: string;
}

export interface BlockedDatesResponse {
  blockedDates: string[];
}

export interface CreateBookingRequest {
  propertyId: UUID;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  paymentMethod: PaymentMethod;
  specialRequests?: string;
}

export interface CreatePropertyRequest {
  title: string;
  description: string;
  propertyType: PropertyType;
  address: string;
  city: string;
  pricePerNight: number;
  latitude: number;
  longitude: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  active: boolean;
  tagNames: string[];
  media?: Array<{ url: string; type: PropertyMediaType; displayOrder: number }>;
}

export interface Review {
  id: UUID;
  propertyId: UUID;
  authorId: UUID;
  authorName: string;
  authorAvatarUrl?: string | null;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewRequest {
  rating: number;
  comment: string;
}

export interface UserNotification {
  id: UUID;
  message: string;
  isRead: boolean;
  createdAt: string;
  targetUrl?: string | null;
}

export interface NotificationInbox {
  unreadCount: number;
  notifications: UserNotification[];
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };
