import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  FileText,
  Clock,
  CheckCircle,
  Package,
} from 'lucide-react';

interface DashboardStats {
  pending_count: number;
  completed_count: number;
  received_count: number;
  cancelled_count: number;
  total_orders: number;
  total_amount: string;
  pending_amount: string;
  received_amount: string;
}

interface StatsCardsProps {
  stats: DashboardStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const statsConfig = [
    {
      title: 'Total Orders',
      value: stats.total_orders,
      subtitle: `Total value: ${formatCurrency(stats.total_amount)}`,
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      title: 'Pending',
      value: stats.pending_count,
      subtitle: `Value: ${formatCurrency(stats.pending_amount)}`,
      icon: Clock,
      color: 'text-yellow-600'
    },
    {
      title: 'Completed',
      value: stats.completed_count,
      subtitle: 'Awaiting delivery',
      icon: CheckCircle,
      color: 'text-blue-600'
    },
    {
      title: 'Received',
      value: stats.received_count,
      subtitle: `Value: ${formatCurrency(stats.received_amount)}`,
      icon: Package,
      color: 'text-green-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statsConfig.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.subtitle}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};