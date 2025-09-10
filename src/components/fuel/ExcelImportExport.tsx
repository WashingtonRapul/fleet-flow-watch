import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import type { FuelTransaction } from '@/types/database';

interface ExcelImportExportProps {
  onImport: (data: Partial<FuelTransaction>[]) => void;
  exportData?: FuelTransaction[];
}

export function ExcelImportExport({ onImport, exportData = [] }: ExcelImportExportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (exportData.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no fuel entries to export',
        variant: 'destructive',
      });
      return;
    }

    // Prepare data for export
    const exportRows = exportData.map(entry => ({
      'Date': format(new Date(entry.date), 'yyyy-MM-dd'),
      'Voucher No': entry.voucher_no,
      'Location': entry.location,
      'Truck ID': entry.truck_id,
      'Driver ID': entry.driver_id,
      'Customer ID': entry.customer_id,
      'Opening Pump': entry.opening_pump,
      'Closing Pump': entry.closing_pump,
      'Litres Issued': entry.litres_issued,
      'Diesel Purchased': entry.diesel_purchased,
      'Previous Balance': entry.previous_balance,
      'Physical Stocks': entry.physical_stocks,
      'Balance': entry.balance,
      'Previous KM': entry.previous_km,
      'Current KM': entry.current_km,
      'KM Covered': entry.km_covered,
      'Consumption Rate': entry.consumption_rate,
      'Budgeted Rate': entry.budgeted_rate,
      'Variance': entry.variance,
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fuel Entries');

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 15 }, // Voucher No
      { wch: 15 }, // Location
      { wch: 15 }, // Truck ID
      { wch: 15 }, // Driver ID
      { wch: 15 }, // Customer ID
      { wch: 12 }, // Opening Pump
      { wch: 12 }, // Closing Pump
      { wch: 12 }, // Litres Issued
      { wch: 15 }, // Diesel Purchased
      { wch: 15 }, // Previous Balance
      { wch: 15 }, // Physical Stocks
      { wch: 12 }, // Balance
      { wch: 12 }, // Previous KM
      { wch: 12 }, // Current KM
      { wch: 12 }, // KM Covered
      { wch: 15 }, // Consumption Rate
      { wch: 15 }, // Budgeted Rate
      { wch: 12 }, // Variance
    ];
    ws['!cols'] = colWidths;

    // Generate file and download
    const fileName = `fuel_entries_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: 'Export successful',
      description: `Exported ${exportData.length} fuel entries to ${fileName}`,
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Transform the data to match our database schema
        const transformedData = jsonData.map((row: any) => ({
          date: row['Date'] || format(new Date(), 'yyyy-MM-dd'),
          voucher_no: row['Voucher No'] || '',
          location: row['Location'] || '',
          truck_id: row['Truck ID'] || '',
          driver_id: row['Driver ID'] || '',
          customer_id: row['Customer ID'] || '',
          opening_pump: parseFloat(row['Opening Pump']) || 0,
          closing_pump: parseFloat(row['Closing Pump']) || 0,
          diesel_purchased: parseFloat(row['Diesel Purchased']) || 0,
          previous_balance: parseFloat(row['Previous Balance']) || 0,
          physical_stocks: parseFloat(row['Physical Stocks']) || 0,
          previous_km: parseInt(row['Previous KM']) || 0,
          current_km: parseInt(row['Current KM']) || 0,
          budgeted_rate: parseFloat(row['Budgeted Rate']) || null,
        }));
        
        onImport(transformedData);
        
        toast({
          title: 'Import successful',
          description: `Imported ${transformedData.length} fuel entries`,
        });
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: 'Import failed',
          description: 'Failed to import Excel file. Please check the file format.',
          variant: 'destructive',
        });
      }
    };
    
    reader.readAsBinaryString(file);
  };

  const handleDownloadTemplate = () => {
    // Create template with sample data
    const template = [
      {
        'Date': format(new Date(), 'yyyy-MM-dd'),
        'Voucher No': 'V001',
        'Location': 'warehouse',
        'Truck ID': '',
        'Driver ID': '',
        'Customer ID': '',
        'Opening Pump': 0,
        'Closing Pump': 100,
        'Diesel Purchased': 500,
        'Previous Balance': 1000,
        'Physical Stocks': 1400,
        'Previous KM': 10000,
        'Current KM': 10250,
        'Budgeted Rate': 0.4,
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Set column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 15 }, // Voucher No
      { wch: 15 }, // Location
      { wch: 15 }, // Truck ID
      { wch: 15 }, // Driver ID
      { wch: 15 }, // Customer ID
      { wch: 12 }, // Opening Pump
      { wch: 12 }, // Closing Pump
      { wch: 15 }, // Diesel Purchased
      { wch: 15 }, // Previous Balance
      { wch: 15 }, // Physical Stocks
      { wch: 12 }, // Previous KM
      { wch: 12 }, // Current KM
      { wch: 15 }, // Budgeted Rate
    ];
    ws['!cols'] = colWidths;
    
    XLSX.writeFile(wb, 'fuel_entry_template.xlsx');
    
    toast({
      title: 'Template downloaded',
      description: 'Use this template to import fuel entries',
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={handleExport} variant="outline">
        <Download className="mr-2 h-4 w-4" />
        Export to Excel
      </Button>
      
      <div className="flex items-center gap-2">
        <Input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleImport}
          className="hidden"
          id="excel-import"
        />
        <Label htmlFor="excel-import">
          <Button variant="outline" asChild>
            <span>
              <Upload className="mr-2 h-4 w-4" />
              Import from Excel
            </span>
          </Button>
        </Label>
      </div>
      
      <Button onClick={handleDownloadTemplate} variant="ghost">
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Download Template
      </Button>
    </div>
  );
}