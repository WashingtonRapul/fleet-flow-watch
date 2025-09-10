import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loader2, Save, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { ExcelImportExport } from '@/components/fuel/ExcelImportExport';
import type { LocationType, FuelTransaction } from '@/types/database';

export default function FuelEntry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    voucher_no: '',
    location: '' as LocationType | '',
    truck_id: '',
    driver_id: '',
    customer_id: '',
    opening_pump: '',
    closing_pump: '',
    diesel_purchased: '0',
    previous_balance: '0',
    physical_stocks: '',
    previous_km: '',
    current_km: '',
  });

  // Fetch dropdown data
  const { data: trucks = [] } = useQuery<Array<{truck_id: string; truck_number: string}>>({
    queryKey: ['trucks-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trucks')
        .select('truck_id, truck_number')
        .eq('status', 'active')
        .order('truck_number');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: drivers = [] } = useQuery<Array<{driver_id: string; driver_name: string}>>({
    queryKey: ['drivers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('driver_id, driver_name')
        .eq('status', 'active')
        .order('driver_name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: customers = [] } = useQuery<Array<{customer_id: string; customer_name: string}>>({
    queryKey: ['customers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('customer_id, customer_name')
        .eq('status', 'active')
        .order('customer_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch budgeted rate when truck is selected
  const { data: budgetedRate } = useQuery<number | null>({
    queryKey: ['budgeted-rate', formData.truck_id, formData.date],
    queryFn: async () => {
      if (!formData.truck_id) return null;
      
      const { data, error } = await supabase
        .from('budgeted_rates')
        .select('budgeted_rate')
        .eq('truck_id', formData.truck_id)
        .lte('effective_date', formData.date)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error) return null;
      return (data as any)?.budgeted_rate || null;
    },
    enabled: !!formData.truck_id,
  });

  // Fetch last transaction for previous balance
  const { data: lastTransaction } = useQuery<{balance: number} | null>({
    queryKey: ['last-transaction'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_transactions')
        .select('balance')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) return null;
      return data;
    },
  });

  // Fetch recent transactions for export
  const { data: recentTransactions = [] } = useQuery<FuelTransaction[]>({
    queryKey: ['recent-transactions-export'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('fuel_transactions')
        .insert({
          ...data,
          created_by: user.user?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Fuel transaction recorded successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['last-transaction'] });
      
      // Reset form
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        voucher_no: '',
        location: '' as LocationType | '',
        truck_id: '',
        driver_id: '',
        customer_id: '',
        opening_pump: '',
        closing_pump: '',
        diesel_purchased: '0',
        previous_balance: lastTransaction && lastTransaction.balance ? lastTransaction.balance.toString() : '0',
        physical_stocks: '',
        previous_km: '',
        current_km: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save transaction',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (parseFloat(formData.closing_pump) < parseFloat(formData.opening_pump)) {
      toast({
        title: 'Validation Error',
        description: 'Closing pump reading must be greater than opening pump reading',
        variant: 'destructive',
      });
      return;
    }
    
    if (parseFloat(formData.current_km) < parseFloat(formData.previous_km)) {
      toast({
        title: 'Validation Error',
        description: 'Current KM must be greater than previous KM',
        variant: 'destructive',
      });
      return;
    }

    const submissionData = {
      ...formData,
      location: formData.location as LocationType,
      opening_pump: parseFloat(formData.opening_pump),
      closing_pump: parseFloat(formData.closing_pump),
      diesel_purchased: parseFloat(formData.diesel_purchased),
      previous_balance: lastTransaction && lastTransaction.balance !== null && lastTransaction.balance !== undefined ? lastTransaction.balance : parseFloat(formData.previous_balance),
      physical_stocks: parseFloat(formData.physical_stocks),
      previous_km: parseInt(formData.previous_km),
      current_km: parseInt(formData.current_km),
      budgeted_rate: budgetedRate,
    };

    submitMutation.mutate(submissionData);
  };

  // Handle bulk import from Excel
  const handleBulkImport = async (importedData: Partial<FuelTransaction>[]) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      // Process each imported row
      for (const row of importedData) {
        const submissionData = {
          ...row,
          created_by: user.user?.id,
          // Calculate derived fields
          litres_issued: row.closing_pump && row.opening_pump 
            ? row.closing_pump - row.opening_pump 
            : 0,
          km_covered: row.current_km && row.previous_km 
            ? row.current_km - row.previous_km 
            : 0,
          consumption_rate: row.current_km && row.previous_km && row.closing_pump && row.opening_pump
            ? (row.closing_pump - row.opening_pump) / (row.current_km - row.previous_km)
            : 0,
          balance: (row.previous_balance || 0) + (row.diesel_purchased || 0) - 
                   ((row.closing_pump || 0) - (row.opening_pump || 0)),
          variance: row.budgeted_rate && row.current_km && row.previous_km && row.closing_pump && row.opening_pump
            ? ((row.closing_pump - row.opening_pump) / (row.current_km - row.previous_km)) - row.budgeted_rate
            : null,
        };
        
        const { error } = await supabase
          .from('fuel_transactions')
          .insert(submissionData as any);
        
        if (error) {
          console.error('Error importing row:', error);
          toast({
            title: 'Import Warning',
            description: `Failed to import row with voucher ${row.voucher_no}`,
            variant: 'destructive',
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions-export'] });
      queryClient.invalidateQueries({ queryKey: ['last-transaction'] });
      
      toast({
        title: 'Import Complete',
        description: `Successfully imported ${importedData.length} fuel entries`,
      });
    } catch (error) {
      console.error('Bulk import error:', error);
      toast({
        title: 'Import Failed',
        description: 'Failed to import fuel entries',
        variant: 'destructive',
      });
    }
  };

  // Calculated values
  const litresIssued = formData.closing_pump && formData.opening_pump 
    ? (parseFloat(formData.closing_pump) - parseFloat(formData.opening_pump)).toFixed(2)
    : '0.00';
    
  const kmCovered = formData.current_km && formData.previous_km
    ? parseInt(formData.current_km) - parseInt(formData.previous_km)
    : 0;
    
  const consumptionRate = kmCovered > 0 && parseFloat(litresIssued) > 0
    ? (parseFloat(litresIssued) / kmCovered).toFixed(4)
    : '0.0000';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fuel Entry</h1>
            <p className="text-muted-foreground">
              Record new fuel transactions
            </p>
          </div>
          <ExcelImportExport 
            onImport={handleBulkImport}
            exportData={recentTransactions}
          />
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>
                Enter fuel consumption and vehicle information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="voucher_no">Voucher No</Label>
                  <Input
                    id="voucher_no"
                    value={formData.voucher_no}
                    onChange={(e) => setFormData({ ...formData, voucher_no: e.target.value })}
                    placeholder="Enter voucher number"
                    required
                  />
                </div>
              </div>

              {/* Location and Vehicle Selection */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData({ ...formData, location: value as LocationType })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="site-a">Site A</SelectItem>
                      <SelectItem value="site-b">Site B</SelectItem>
                      <SelectItem value="site-c">Site C</SelectItem>
                      <SelectItem value="headquarters">Headquarters</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="truck">Truck</Label>
                  <Select
                    value={formData.truck_id}
                    onValueChange={(value) => setFormData({ ...formData, truck_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select truck" />
                    </SelectTrigger>
                    <SelectContent>
                      {trucks.map((truck) => (
                        <SelectItem key={truck.truck_id} value={truck.truck_id}>
                          {truck.truck_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Driver and Customer */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="driver">Driver</Label>
                  <Select
                    value={formData.driver_id}
                    onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.driver_id} value={driver.driver_id}>
                          {driver.driver_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.customer_id} value={customer.customer_id}>
                          {customer.customer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pump Readings */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="opening_pump">Opening Pump</Label>
                  <Input
                    id="opening_pump"
                    type="number"
                    step="0.01"
                    value={formData.opening_pump}
                    onChange={(e) => setFormData({ ...formData, opening_pump: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="closing_pump">Closing Pump</Label>
                  <Input
                    id="closing_pump"
                    type="number"
                    step="0.01"
                    value={formData.closing_pump}
                    onChange={(e) => setFormData({ ...formData, closing_pump: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="diesel_purchased">Diesel Purchased</Label>
                  <Input
                    id="diesel_purchased"
                    type="number"
                    step="0.01"
                    value={formData.diesel_purchased}
                    onChange={(e) => setFormData({ ...formData, diesel_purchased: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="physical_stocks">Physical Stocks</Label>
                  <Input
                    id="physical_stocks"
                    type="number"
                    step="0.01"
                    value={formData.physical_stocks}
                    onChange={(e) => setFormData({ ...formData, physical_stocks: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Kilometer Readings */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="previous_km">Previous KM</Label>
                  <Input
                    id="previous_km"
                    type="number"
                    value={formData.previous_km}
                    onChange={(e) => setFormData({ ...formData, previous_km: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="current_km">Current KM</Label>
                  <Input
                    id="current_km"
                    type="number"
                    value={formData.current_km}
                    onChange={(e) => setFormData({ ...formData, current_km: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              {/* Calculated Values */}
              <Alert>
                <Calculator className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <div className="grid gap-4 md:grid-cols-4 mt-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Litres Issued</span>
                      <p className="font-semibold">{litresIssued} L</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">KM Covered</span>
                      <p className="font-semibold">{kmCovered} km</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Consumption Rate</span>
                      <p className="font-semibold">{consumptionRate} L/km</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Budgeted Rate</span>
                      <p className="font-semibold">{budgetedRate?.toFixed(4) || 'N/A'} L/km</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button type="submit" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Transaction
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </Layout>
  );
}