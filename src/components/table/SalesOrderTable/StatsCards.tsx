import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  CreditCard,
  Building2,
} from 'lucide-react';
import { SalesOrderStats } from './useSalesOrderData';

interface StatsCardsProps {
  stats: SalesOrderStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const statsCards = [
    {
      title: 'Total Orders',
      value: formatNumber(stats.total_orders),
      icon: ShoppingCart,
      description: 'All sales orders',
      className: 'text-blue-600',
      bgClassName: 'bg-blue-100',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.total_revenue),
      icon: DollarSign,
      description: 'Gross sales amount',
      className: 'text-green-600',
      bgClassName: 'bg-green-100',
    },
    {
      title: 'Total Profit',
      value: formatCurrency(stats.total_profit),
      icon: TrendingUp,
      description: 'Net profit earned',
      className: 'text-purple-600',
      bgClassName: 'bg-purple-100',
    },
    {
      title: 'Avg Order Value',
      value: formatCurrency(stats.average_order_value),
      icon: CreditCard,
      description: 'Per order average',
      className: 'text-orange-600',
      bgClassName: 'bg-orange-100',
    },
    {
      title: 'Completed Orders',
      value: formatNumber(stats.completed_orders),
      icon: CheckCircle,
      description: `${((stats.completed_orders / stats.total_orders) * 100).toFixed(1)}% completion rate`,
      className: 'text-green-600',
      bgClassName: 'bg-green-100',
    },
    {
      title: 'Pending Orders',
      value: formatNumber(stats.pending_orders),
      icon: Clock,
      description: `${((stats.pending_orders / stats.total_orders) * 100).toFixed(1)}% pending`,
      className: 'text-yellow-600',
      bgClassName: 'bg-yellow-100',
    },
    {
      title: 'Unique Customers',
      value: formatNumber(stats.unique_customers),
      icon: Users,
      description: 'Different customers',
      className: 'text-indigo-600',
      bgClassName: 'bg-indigo-100',
    },
    {
      title: 'Active Branches',
      value: formatNumber(stats.branches_involved),
      icon: Building2,
      description: 'Branches with sales',
      className: 'text-teal-600',
      bgClassName: 'bg-teal-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statsCards.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${stat.bgClassName}`}>
              <stat.icon className={`h-4 w-4 ${stat.className}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
