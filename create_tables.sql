-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'user', 'pending');
CREATE TYPE status_type AS ENUM ('active', 'inactive');
CREATE TYPE truck_type AS ENUM ('tipper', 'flatbed', 'tanker', 'container', 'other');
CREATE TYPE location_type AS ENUM ('warehouse', 'site-a', 'site-b', 'site-c', 'headquarters', 'other');

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role DEFAULT 'pending',
    full_name TEXT,
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trucks table
CREATE TABLE trucks (
    truck_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    truck_number TEXT NOT NULL UNIQUE,
    truck_type truck_type NOT NULL,
    capacity NUMERIC,
    status status_type DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create drivers table
CREATE TABLE drivers (
    driver_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_name TEXT NOT NULL,
    license_no TEXT,
    status status_type DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customers table
CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name TEXT NOT NULL,
    status status_type DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create budgeted_rates table
CREATE TABLE budgeted_rates (
    rate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    truck_id UUID REFERENCES trucks(truck_id) ON DELETE CASCADE,
    budgeted_rate NUMERIC NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(truck_id, effective_date)
);

-- Create fuel_transactions table
CREATE TABLE fuel_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    voucher_no TEXT NOT NULL,
    location location_type NOT NULL,
    truck_id UUID REFERENCES trucks(truck_id),
    driver_id UUID REFERENCES drivers(driver_id),
    customer_id UUID REFERENCES customers(customer_id),
    opening_pump NUMERIC NOT NULL,
    closing_pump NUMERIC NOT NULL,
    litres_issued NUMERIC GENERATED ALWAYS AS (closing_pump - opening_pump) STORED,
    diesel_purchased NUMERIC NOT NULL DEFAULT 0,
    previous_balance NUMERIC NOT NULL DEFAULT 0,
    balance NUMERIC GENERATED ALWAYS AS (previous_balance + diesel_purchased - (closing_pump - opening_pump)) STORED,
    physical_stocks NUMERIC NOT NULL DEFAULT 0,
    variance NUMERIC GENERATED ALWAYS AS (physical_stocks - (previous_balance + diesel_purchased - (closing_pump - opening_pump))) STORED,
    previous_km NUMERIC NOT NULL,
    current_km NUMERIC NOT NULL,
    km_covered NUMERIC GENERATED ALWAYS AS (current_km - previous_km) STORED,
    budgeted_rate NUMERIC,
    consumption_rate NUMERIC GENERATED ALWAYS AS (
        CASE 
            WHEN (current_km - previous_km) > 0 THEN (current_km - previous_km) / NULLIF(closing_pump - opening_pump, 0)
            ELSE 0
        END
    ) STORED,
    consumption_difference NUMERIC GENERATED ALWAYS AS (
        CASE 
            WHEN (current_km - previous_km) > 0 AND budgeted_rate IS NOT NULL 
            THEN ((current_km - previous_km) / NULLIF(closing_pump - opening_pump, 0)) - budgeted_rate
            ELSE 0
        END
    ) STORED,
    consumption_difference_litres NUMERIC GENERATED ALWAYS AS (
        CASE 
            WHEN (current_km - previous_km) > 0 AND budgeted_rate IS NOT NULL 
            THEN (current_km - previous_km) / NULLIF(budgeted_rate, 0) - (closing_pump - opening_pump)
            ELSE 0
        END
    ) STORED,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_fuel_transactions_date ON fuel_transactions(date DESC);
CREATE INDEX idx_fuel_transactions_truck ON fuel_transactions(truck_id);
CREATE INDEX idx_fuel_transactions_driver ON fuel_transactions(driver_id);
CREATE INDEX idx_fuel_transactions_customer ON fuel_transactions(customer_id);
CREATE INDEX idx_budgeted_rates_truck ON budgeted_rates(truck_id);
CREATE INDEX idx_budgeted_rates_date ON budgeted_rates(effective_date DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trucks_updated_at BEFORE UPDATE ON trucks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgeted_rates_updated_at BEFORE UPDATE ON budgeted_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fuel_transactions_updated_at BEFORE UPDATE ON fuel_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        'pending'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgeted_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for trucks (accessible by approved users)
CREATE POLICY "Approved users can view trucks" ON trucks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_approved = true
        )
    );

CREATE POLICY "Admins can manage trucks" ON trucks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for drivers (accessible by approved users)
CREATE POLICY "Approved users can view drivers" ON drivers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_approved = true
        )
    );

CREATE POLICY "Admins can manage drivers" ON drivers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for customers (accessible by approved users)
CREATE POLICY "Approved users can view customers" ON customers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_approved = true
        )
    );

CREATE POLICY "Admins can manage customers" ON customers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for budgeted_rates (accessible by approved users)
CREATE POLICY "Approved users can view rates" ON budgeted_rates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_approved = true
        )
    );

CREATE POLICY "Admins can manage rates" ON budgeted_rates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for fuel_transactions
CREATE POLICY "Approved users can view fuel transactions" ON fuel_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_approved = true
        )
    );

CREATE POLICY "Approved users can create fuel transactions" ON fuel_transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND is_approved = true
        )
    );

CREATE POLICY "Admins can manage all fuel transactions" ON fuel_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;