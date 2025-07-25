"use client"
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  History,
  Filter,
  Download,
  Search,
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Eye,
  FileText,
  RefreshCw,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';

interface InventoryOverview {
  total_products: number;
  total_stock_value: number;
  total_quantity: number;
  low_stock_items: number;
  out_of_stock_items: number;
  expiring_batches: number;
  recent_movements: Array<{
    id: string;
    product_name: string;
    entry_type: string;
    quantity: number;
    created_at: string;
  }>;
  top_selling_products: Array<{
    product_id: string;
    product_name: string;
    total_sold: number;
    revenue: number;
  }>;
  branch_summary: Array<{
    branch_id: string;
    branch_name: string;
    total_products: number;
    total_value: number;
    low_stock_count: number;
  }>;
  category_breakdown: Array<{
    category: string;
    product_count: number;
    total_value: number;
    avg_stock_level: number;
  }>;
}

 const InventoryOverviewComponent: React.FC = () => {
  const [overview, setOverview] = useState<InventoryOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30'); // days
  const [activeTab, setActiveTab] = useState('summary');

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inventory/overview?period=${selectedPeriod}`);
      const result = await response.json();

      if (result.success) {
        setOverview(result.data);
      } else {
        toast.error('Failed to fetch inventory overview');
      }
    } catch (error) {
      console.error('Error fetching inventory overview:', error);
      toast.error('Error loading inventory overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [selectedPeriod]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount);
  };

  const periodOptions = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 3 months' },
    { value: '365', label: 'Last year' },
  ];

  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading inventory overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Overview</h1>
          <p className="text-muted-foreground">
            Complete overview of your inventory performance and status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={fetchOverview}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.total_products?.toLocaleString() ?? "0"}</div>
            <p className="text-xs text-muted-foreground">
              Across all locations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(overview.total_stock_value)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total stock value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{overview.low_stock_items}</div>
            <p className="text-xs text-muted-foreground">
              Need restocking
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overview.out_of_stock_items}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'summary', label: 'Summary', icon: Package },
            { id: 'movements', label: 'Recent Movements', icon: History },
            { id: 'performance', label: 'Performance', icon: TrendingUp },
            { id: 'branches', label: 'Branch Overview', icon: Package },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>
                Inventory distribution by product category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overview.category_breakdown?.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{category.category}</div>
                      <div className="text-sm text-muted-foreground">
                        {category.product_count} products
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(category.total_value)}</div>
                      <div className="text-sm text-muted-foreground">
                        Avg: {category.avg_stock_level} units
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stock Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Status</CardTitle>
              <CardDescription>
                Current stock health overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Good Stock</span>
                  </div>
                  <span className="font-medium">
                    {/* {overview.total_products - overview.low_stock_items - overview.out_of_stock_items} */}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>Low Stock</span>
                  </div>
                  <span className="font-medium text-yellow-600">{overview.low_stock_items}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Out of Stock</span>
                  </div>
                  <span className="font-medium text-red-600">{overview.out_of_stock_items}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>Expiring Soon</span>
                  </div>
                  <span className="font-medium text-orange-600">{overview.expiring_batches}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'movements' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Stock Movements</CardTitle>
            <CardDescription>
              Latest inventory transactions and changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overview.recent_movements.map((movement) => (
                <div key={movement.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="font-medium">{movement.product_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(movement.created_at).toLocaleString()??'0'}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={movement.entry_type === 'SALE' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {movement.entry_type}
                    </Badge>
                    <div className="text-sm font-medium">
                      {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'performance' && (
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>
              Best performing products in the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overview.top_selling_products.map((product, index) => (
                <div key={product.product_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{product.product_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.total_sold} units sold
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(product.revenue)}</div>
                    <div className="text-sm text-muted-foreground">Revenue</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'branches' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {overview.branch_summary.map((branch) => (
            <Card key={branch.branch_id}>
              <CardHeader>
                <CardTitle className="text-lg">{branch.branch_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Products:</span>
                    {/* <span className="font-medium">{branch.total_products}</span> */}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inventory Value:</span>
                    {/* <span className="font-medium">{formatCurrency(branch.total_value)}</span> */}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Low Stock:</span>
                    <span className={`font-medium ${branch.low_stock_count > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {branch.low_stock_count}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InventoryOverviewComponent;