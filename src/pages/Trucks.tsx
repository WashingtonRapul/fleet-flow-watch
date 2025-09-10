import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Edit, Trash2, Truck } from 'lucide-react';
import type { Truck as TruckData, TruckType } from '@/types/database';

export default function Trucks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<TruckData | null>(null);
  
  const [formData, setFormData] = useState({
    truck_number: '',
    truck_type: '' as TruckType | '',
    capacity: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Fetch trucks
  const { data: trucks = [], isLoading } = useQuery<TruckData[]>({
    queryKey: ['trucks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trucks')
        .select('*')
        .order('truck_number');
      if (error) throw error;
      return data || [];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { truck_number: string; truck_type: TruckType; capacity: number | null; status: 'active' | 'inactive' }) => {
      if (editingTruck) {
        const { error } = await supabase
          .from('trucks')
          .update(data as never)
          .eq('truck_id', editingTruck.truck_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('trucks')
          .insert(data as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Truck ${editingTruck ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save truck',
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (truckId: string) => {
      const { error } = await supabase
        .from('trucks')
        .delete()
        .eq('truck_id', truckId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Truck deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete truck',
        variant: 'destructive',
      });
    },
  });

  const handleOpenDialog = (truck?: TruckData) => {
    if (truck) {
      setEditingTruck(truck);
      setFormData({
        truck_number: truck.truck_number,
        truck_type: truck.truck_type,
        capacity: truck.capacity?.toString() || '',
        status: truck.status,
      });
    } else {
      setEditingTruck(null);
      setFormData({
        truck_number: '',
        truck_type: '' as TruckType | '',
        capacity: '',
        status: 'active',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTruck(null);
    setFormData({
      truck_number: '',
      truck_type: '' as TruckType | '',
      capacity: '',
      status: 'active',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submissionData = {
      truck_number: formData.truck_number,
      capacity: formData.capacity ? parseFloat(formData.capacity) : null,
      status: formData.status,
    };

    saveMutation.mutate(submissionData);
  };

  const handleDelete = (truckId: string) => {
    if (window.confirm('Are you sure you want to delete this truck?')) {
      deleteMutation.mutate(truckId);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trucks</h1>
            <p className="text-muted-foreground">
              Manage your fleet vehicles
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Truck
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Trucks</CardTitle>
            <CardDescription>
              View and manage all trucks in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : trucks.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No trucks found</p>
                <Button onClick={() => handleOpenDialog()} className="mt-4" variant="outline">
                  Add your first truck
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Truck Number</TableHead>
                    <TableHead>Capacity (L)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trucks.map((truck) => (
                    <TableRow key={truck.truck_id}>
                      <TableCell className="font-medium">{truck.truck_number}</TableCell>
                      <TableCell>{truck.capacity || '-'}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          truck.status === 'active' 
                            ? "bg-success/10 text-success" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {truck.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(truck)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(truck.truck_id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTruck ? 'Edit Truck' : 'Add New Truck'}</DialogTitle>
              <DialogDescription>
                {editingTruck ? 'Update truck information' : 'Add a new truck to your fleet'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="truck_number">Truck Number</Label>
                  <Input
                    id="truck_number"
                    value={formData.truck_number}
                    onChange={(e) => setFormData({ ...formData, truck_number: e.target.value })}
                    placeholder="e.g., TRK-001"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity (Litres)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    step="0.01"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="e.g., 500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'inactive') => 
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}