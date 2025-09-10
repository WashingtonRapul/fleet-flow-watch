export type UserRole = 'admin' | 'user' | 'pending';
export type StatusType = 'active' | 'inactive';
export type TruckType = 'tipper' | 'flatbed' | 'tanker' | 'container' | 'other';
export type LocationType = 'warehouse' | 'site-a' | 'site-b' | 'site-c' | 'headquarters' | 'other';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Truck {
  truck_id: string;
  truck_number: string;
  truck_type: TruckType;
  capacity: number | null;
  status: StatusType;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  driver_id: string;
  driver_name: string;
  license_no: string | null;
  status: StatusType;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  customer_id: string;
  customer_name: string;
  status: StatusType;
  created_at: string;
  updated_at: string;
}

export interface BudgetedRate {
  rate_id: string;
  truck_id: string | null;
  budgeted_rate: number;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

export interface FuelTransaction {
  transaction_id: string;
  date: string;
  voucher_no: string;
  location: LocationType;
  truck_id: string | null;
  driver_id: string | null;
  customer_id: string | null;
  opening_pump: number;
  closing_pump: number;
  litres_issued: number;
  diesel_purchased: number;
  previous_balance: number;
  balance: number;
  physical_stocks: number;
  variance: number;
  previous_km: number;
  current_km: number;
  km_covered: number;
  budgeted_rate: number | null;
  consumption_rate: number;
  consumption_difference: number;
  consumption_difference_litres: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      trucks: {
        Row: Truck;
        Insert: Omit<Truck, 'truck_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Truck, 'truck_id' | 'created_at' | 'updated_at'>>;
      };
      drivers: {
        Row: Driver;
        Insert: Omit<Driver, 'driver_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Driver, 'driver_id' | 'created_at' | 'updated_at'>>;
      };
      customers: {
        Row: Customer;
        Insert: Omit<Customer, 'customer_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Customer, 'customer_id' | 'created_at' | 'updated_at'>>;
      };
      budgeted_rates: {
        Row: BudgetedRate;
        Insert: Omit<BudgetedRate, 'rate_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BudgetedRate, 'rate_id' | 'created_at' | 'updated_at'>>;
      };
      fuel_transactions: {
        Row: FuelTransaction;
        Insert: Omit<FuelTransaction, 'transaction_id' | 'litres_issued' | 'balance' | 'variance' | 'km_covered' | 'consumption_rate' | 'consumption_difference' | 'consumption_difference_litres' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<FuelTransaction, 'transaction_id' | 'litres_issued' | 'balance' | 'variance' | 'km_covered' | 'consumption_rate' | 'consumption_difference' | 'consumption_difference_litres' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}