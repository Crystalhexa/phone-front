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
  AlertTriangle,
  BarChart3,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface InventoryMovement {
  id: string;
  product_name: string;
  product_sku: string;
  entry_type: string;
  quantity: number;
  created_at: string;
  branch_name: string;
}

interface TopSellingProduct {
  product_id: string;
  product_name: string;
  product_sku: string;
  total_sold: number;
  revenue: number;
  order_count: number;
}

interface BranchSummary {
  branch_id: string;
  branch_name: string;
  branch_code: string;
  total_products: number;
  total_value: number;
  total_quantity: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

interface CategoryBreakdown {
  category: string;
  product_count: number;
  total_value: number;
  total_quantity: number;
  avg_stock_level: number;
}

interface AlertsSummary {
  total_alerts: number;
  low_stock_alerts: number;
  out_of_stock_alerts: number;
  critical_stock_alerts: number;
  active_alerts: number;
}

interface InventoryTrend {
  date: string;
  value_in: number;
  value_out: number;
}

interface InventoryOverview {
  total_products: number;
  total_stock_value: number;
  total_quantity: number;
  low_stock_items: number;
  out_of_stock_items: number;
  expiring_items: number;
  alerts: AlertsSummary;
  recent_movements: InventoryMovement[];
  top_selling_products: TopSellingProduct[];
  inventory_trend: InventoryTrend[];
  branch_summary: BranchSummary[];
  category_breakdown: CategoryBreakdown[];
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

  const getEntryTypeColor = (entryType: string) => {
    switch (entryType) {
      case 'PURCHASE':
      case 'TRANSFER_IN':
      case 'ADJUSTMENT':
        return 'bg-green-100 text-green-800';
      case 'SALE':
      case 'TRANSFER_OUT':
        return 'bg-red-100 text-red-800';
      case 'RETURN':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getGoodStockCount = () => {
    if (!overview) return 0;
    return overview.total_products - overview.low_stock_items - overview.out_of_stock_items;
  };

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
            <div className="text-2xl font-bold">{overview.total_products.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {overview.total_quantity.toLocaleString()} total units
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
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overview.alerts.active_alerts}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-xl font-bold text-red-600">{overview.out_of_stock_items}</p>
              </div>
              <Package className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-xl font-bold text-orange-600">{overview.expiring_items}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Stock</p>
                <p className="text-xl font-bold text-red-700">{overview.alerts.critical_stock_alerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-700" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Good Stock</p>
                <p className="text-xl font-bold text-green-600">{getGoodStockCount()}</p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
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
            { id: 'branches', label: 'Branch Overview', icon: BarChart3 },
            { id: 'trends', label: 'Trends', icon: TrendingUp },
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
                        {category.product_count} products • {category.total_quantity} units
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(category.total_value)}</div>
                      <div className="text-sm text-muted-foreground">
                        Avg: {Math.round(category.avg_stock_level)} units
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
                  <span className="font-medium">{getGoodStockCount()}</span>
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
                  <span className="font-medium text-orange-600">{overview.expiring_items}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span>Critical Stock</span>
                  </div>
                  <span className="font-medium text-purple-600">{overview.alerts.critical_stock_alerts}</span>
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
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{movement.product_name}</div>
                      <Badge variant="outline" className="text-xs">{movement.product_sku}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {movement.branch_name} • {new Date(movement.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <Badge className={getEntryTypeColor(movement.entry_type)}>
                      {movement.entry_type.replace('_', ' ')}
                    </Badge>
                    <div className="text-sm font-medium min-w-[60px]">
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
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{product.product_name}</div>
                        <Badge variant="outline" className="text-xs">{product.product_sku}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {product.total_sold} units • {product.order_count} orders
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(product.revenue)}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(product.revenue / product.total_sold)}/unit
                    </div>
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
                <CardDescription>Branch Code: {branch.branch_code}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Products:</span>
                    <span className="font-medium">{branch.total_products}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Units:</span>
                    <span className="font-medium">{branch.total_quantity.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inventory Value:</span>
                    <span className="font-medium">{formatCurrency(branch.total_value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Low Stock:</span>
                    <span className={`font-medium ${branch.low_stock_count > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {branch.low_stock_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Out of Stock:</span>
                    <span className={`font-medium ${branch.out_of_stock_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {branch.out_of_stock_count}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Value Trend</CardTitle>
              <CardDescription>
                Daily inventory value changes (last 7 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overview.inventory_trend.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{new Date(trend.date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-4">
                        <div className="text-green-600">
                          +{formatCurrency(trend.value_in)}
                        </div>
                        <div className="text-red-600">
                          -{formatCurrency(trend.value_out)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alerts Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Alerts Summary</CardTitle>
              <CardDescription>
                Current inventory alerts breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span>Low Stock Alerts</span>
                  </div>
                  <span className="font-medium text-yellow-600">{overview.alerts.low_stock_alerts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Out of Stock Alerts</span>
                  </div>
                  <span className="font-medium text-red-600">{overview.alerts.out_of_stock_alerts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-700" />
                    <span>Critical Stock Alerts</span>
                  </div>
                  <span className="font-medium text-red-700">{overview.alerts.critical_stock_alerts}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="font-medium">Total Active Alerts</span>
                  <span className="font-bold text-primary">{overview.alerts.active_alerts}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InventoryOverviewComponent;