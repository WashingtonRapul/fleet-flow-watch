// Generated database types for Supabase integration
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'user'
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'user'
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'user'
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      trucks: {
        Row: {
          truck_id: string
          truck_number: string
          truck_type: 'tipper' | 'flatbed' | 'tanker' | 'container' | 'other'
          capacity: number | null
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          truck_number: string
          truck_type: 'tipper' | 'flatbed' | 'tanker' | 'container' | 'other'
          capacity?: number | null
          status?: 'active' | 'inactive'
        }
        Update: {
          truck_number?: string
          truck_type?: 'tipper' | 'flatbed' | 'tanker' | 'container' | 'other'
          capacity?: number | null
          status?: 'active' | 'inactive'
        }
      }
      drivers: {
        Row: {
          driver_id: string
          driver_name: string
          license_no: string | null
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          driver_name: string
          license_no?: string | null
          status?: 'active' | 'inactive'
        }
        Update: {
          driver_name?: string
          license_no?: string | null
          status?: 'active' | 'inactive'
        }
      }
      customers: {
        Row: {
          customer_id: string
          customer_name: string
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          customer_name: string
          status?: 'active' | 'inactive'
        }
        Update: {
          customer_name?: string
          status?: 'active' | 'inactive'
        }
      }
      budgeted_rates: {
        Row: {
          rate_id: string
          truck_id: string | null
          budgeted_rate: number
          effective_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          truck_id?: string | null
          budgeted_rate: number
          effective_date: string
        }
        Update: {
          truck_id?: string | null
          budgeted_rate?: number
          effective_date?: string
        }
      }
      fuel_transactions: {
        Row: {
          transaction_id: string
          date: string
          voucher_no: string
          location: 'warehouse' | 'site-a' | 'site-b' | 'site-c' | 'headquarters' | 'other'
          truck_id: string | null
          driver_id: string | null
          customer_id: string | null
          opening_pump: number
          closing_pump: number
          litres_issued: number
          diesel_purchased: number
          previous_balance: number
          balance: number
          physical_stocks: number
          variance: number
          previous_km: number
          current_km: number
          km_covered: number
          budgeted_rate: number | null
          consumption_rate: number
          consumption_difference: number
          consumption_difference_litres: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          date: string
          voucher_no: string
          location: 'warehouse' | 'site-a' | 'site-b' | 'site-c' | 'headquarters' | 'other'
          truck_id?: string | null
          driver_id?: string | null
          customer_id?: string | null
          opening_pump: number
          closing_pump: number
          diesel_purchased: number
          previous_balance: number
          physical_stocks: number
          previous_km: number
          current_km: number
          budgeted_rate?: number | null
          created_by?: string | null
        }
        Update: {
          date?: string
          voucher_no?: string
          location?: 'warehouse' | 'site-a' | 'site-b' | 'site-c' | 'headquarters' | 'other'
          truck_id?: string | null
          driver_id?: string | null
          customer_id?: string | null
          opening_pump?: number
          closing_pump?: number
          diesel_purchased?: number
          previous_balance?: number
          physical_stocks?: number
          previous_km?: number
          current_km?: number
          budgeted_rate?: number | null
          created_by?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}