
export enum Platform {
  Direct = 'Direct',
  Airbnb = 'Airbnb',
  BookingCom = 'Booking.com',
  Agoda = 'Agoda',
  iCal = 'iCal',
  Website = 'Website'
}

export enum AddOnState {
  Forecasted = 'forecasted',
  PreSold = 'pre_sold',
  Actual = 'actual'
}

export enum AddOnCategory {
  Tours = 'Tours',
  IslandHopping = 'Island Hopping',
  FoodBeverage = 'Food & Beverage',
  Transportation = 'Transportation', // Pass-through
  Other = 'Other'
}

export enum ExpenseCategory {
  Labor = 'Labor',
  Fuel = 'Fuel',
  FoodBeverage = 'Food & Beverage',
  ProfessionalServices = 'Professional Services',
  CleaningSupplies = 'Cleaning & Supplies',
  RepairsMaintenance = 'Repairs & Maintenance',
  UtilitiesTelecom = 'Utilities / Telecom',
  Other = 'Other'
}

// --- FINANCIAL DEFINITIONS ---
export enum RevenueType {
  Projected = 'PROJECTED', 
  Realized = 'REALIZED'    
}

export interface AddOn {
  id: string;
  category: AddOnCategory | string;
  name: string; 
  amount: number;
  status: AddOnState;
  date?: string;
}

export interface BookingRecord {
  internal_id: string;
  booking_reference: string;
  guest_name: string;
  unit: string;
  platform: Platform;
  guests: number;
  check_in: string; // ISO Date String YYYY-MM-DD
  check_out: string; // ISO Date String YYYY-MM-DD
  amount: number; // Base Amount (room only)
  paid: number; // Amount collected so far
  notes?: string;
  add_ons: AddOn[];
}

// --- EXPENSE MODELS ---

export interface BaseExpense {
  id: string;
  name: string;
  category: ExpenseCategory | string;
  amount: number;
  isRecurring: true;
  active: boolean;
}

export interface MonthlyExpense {
  id: string;
  name: string;
  category: ExpenseCategory | string;
  amount: number;
  month: string; // YYYY-MM
  isRecurring: false;
}

export type Expense = BaseExpense | MonthlyExpense;

// --- Onboarding Types ---

export enum AccommodationType {
  Hotel = 'Hotel',
  Resort = 'Resort',
  Villa = 'Villa',
  Hostel = 'Hostel',
  Guesthouse = 'Guesthouse',
  Homestay = 'Homestay',
  Other = 'Other'
}

export enum UnitType {
  PrivateRoom = 'Private Room',
  EntireUnit = 'Entire Unit',
  DormBedMixed = 'Dorm Bed (Mixed)',
  DormBedFemale = 'Dorm Bed (Female)',
  DormBedMale = 'Dorm Bed (Male)',
  Capsule = 'Capsule',
  Other = 'Other'
}

export interface UnitDefinition {
  id: string;
  name: string;
  type: UnitType | string;
  maxGuests: number;
  baseNightlyRate: number;
  includeInOccupancy: boolean;
}

export interface AddOnCatalogItem {
  id: string;
  category: AddOnCategory | string;
  subCategory: string;
  defaultPrice: number;
}

export interface AccommodationSettings {
  name: string;
  location: string;
  type: AccommodationType | string;
  timezone: string;
  currency: string;
  amenities: {
    wifiMbps?: string;
    hasAC: boolean;
    hasHotShower: boolean;
    hasWorkspace: boolean;
    hasGenerator: boolean;
    breakfastIncluded: boolean;
    other?: string;
  };
}

export const MONTHS = [
  '2025-10', '2025-11', '2025-12', 
  '2026-01', '2026-02', '2026-03', 
  '2026-04', '2026-05', '2026-06', 
  '2026-07', '2026-08', '2026-09'
];
