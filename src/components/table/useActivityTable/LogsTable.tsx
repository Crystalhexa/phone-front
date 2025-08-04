"use client"

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,
  Calendar,
  User,
  Building,
  Activity,
  Eye,
  ChevronLeft,
  ChevronRight,
  Settings,
  BarChart3
} from "lucide-react"
import { useActivityLogsData } from './useActivityLogsData'
import { useBranchData } from '../BranchTable/useBranchData'
import { SearchableDropdown } from '@/components/form/SearchableDropdown'
import { useEmployeeData } from '../EmployeeTable/useEmployeeData'

export default function ActivityLogsTable() {
  const {
    activityLogs,
    stats,
    isLoading,
    searchLoading,
    currentPage,
    totalPages,
    total,
    searchTerm,
    filters,
    handleSearch,
    setCurrentPage,
    handlePageSizeChange,
    updateFilters,
    resetFilters,
    handleRefresh,
    filterByBranch,
    filterByEmployee,
    setDateRange,
    clearDateRange,
    toggleStats,
    exportToCSV,
    getUniqueActions,
    getUniqueEntities,
  } = useActivityLogsData()

  const {
    users: employeeOptions,
    isLoading: isUsersLoading,
    handleSearch: handleEmployeeSearch,
    searchTerm: employeeSearch,
  } = useEmployeeData()
  const {
    data: branchOptions,
    isLoading: isSearching,
    handleSearch: handleBranchSearch,
    searchTerm: branchSearch,
  } = useBranchData();
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss')
  }

  // Get action badge variant
  const getActionVariant = (action: string) => {
    const lowerAction = action.toLowerCase()
    if (lowerAction.includes('create')) return 'default'
    if (lowerAction.includes('update')) return 'secondary'
    if (lowerAction.includes('delete')) return 'destructive'
    if (lowerAction.includes('login')) return 'outline'
    return 'default'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
          <p className="text-muted-foreground">
            Monitor and track user activities across your system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleStats}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            {filters.includeStats ? 'Hide Stats' : 'Show Stats'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Branches</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueBranches}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actions</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueActions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entities</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueEntities}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
                {searchLoading && (
                  <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {(filters.branchId || filters.employeeId || filters.action || filters.entity || filters.startDate) && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {[filters.branchId, filters.employeeId, filters.action, filters.entity, filters.startDate].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={filters.sortBy}
                onValueChange={(value: any) => updateFilters({ sortBy: value })}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Date</SelectItem>
                  <SelectItem value="action">Action</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="branch">Branch</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.sortOrder}
                onValueChange={(value: any) => updateFilters({ sortOrder: value })}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Desc</SelectItem>
                  <SelectItem value="asc">Asc</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                disabled={isLoading}
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Branch</label>
                <SearchableDropdown
                  value={filters.branchId}
                  onValueChange={(value) => updateFilters({ branchId: value })}
                  placeholder="Select Branch"
                  searchPlaceholder="Search branches..."
                  options={branchOptions?.data?.branches || []} // array of branches: { id, name, ... }
                  disabled={false}
                  emptyMessage="No branches found"
                  onSearch={handleBranchSearch} // optional, for remote search
                  searchTerm={searchTerm}
                  isSearching={isSearching}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Employee</label>
                <SearchableDropdown
                  value={filters.employeeId}
                  onValueChange={(value) => updateFilters({ employeeId: value })}
                  placeholder="Select Employee"
                  searchPlaceholder="Search employee..."
                  options={
                    (employeeOptions || []).map((emp: any) => ({
                      id: emp.employee_id,
                      name: emp.name || emp.username || emp.email || '',
                      description: emp.email,
                      code: emp.employeeNumber,
                      // add other fields if needed
                    }))
                  } // array of branches: { id, name, ... }
                  disabled={false}
                  emptyMessage="No employee found"
                  onSearch={handleEmployeeSearch} // optional, for remote search
                  searchTerm={searchTerm}
                  isSearching={isSearching}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Action</label>
                <Select
                  value={filters.action}
                  onValueChange={(value) => updateFilters({ action: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {getUniqueActions().map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => updateFilters({ startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => updateFilters({ endDate: e.target.value })}
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearDateRange}
                  className="gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Clear Dates
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Activity className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No activity logs found</p>
                            <Button variant="outline" size="sm" onClick={resetFilters}>
                              Clear filters
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      activityLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {formatDate(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{log.user.username}</span>
                              <span className="text-sm text-muted-foreground">{log.user.email}</span>
                              {log.user.role && (
                                <Badge variant="outline" className="w-fit text-xs mt-1">
                                  {log.user.role.name}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.employee ? (
                              <div className="flex flex-col">
                                <span className="font-medium">{log.employee.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  #{log.employee.employeeNumber}
                                </span>
                                {log.employee.position && (
                                  <span className="text-xs text-muted-foreground">
                                    {log.employee.position}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.branch ? (
                              <div className="flex flex-col">
                                <span className="font-medium">{log.branch.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {log.branch.code}
                                </span>
                                {log.branch.location && (
                                  <span className="text-xs text-muted-foreground">
                                    {log.branch.location}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActionVariant(log.action)}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{log.entity || '-'}</span>
                              {log.entityId && (
                                <span className="text-sm text-muted-foreground font-mono">
                                  #{log.entityId.slice(-8)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.ipAddress || '-'}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DialogTrigger asChild>
                                    <DropdownMenuItem onClick={() => setSelectedLog(log)}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                  </DialogTrigger>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => filterByBranch(log.branchId || '')}>
                                    <Building className="mr-2 h-4 w-4" />
                                    Filter by Branch
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => filterByEmployee(log.employee?.id || '')}>
                                    <User className="mr-2 h-4 w-4" />
                                    Filter by Employee
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Activity Log Details</DialogTitle>
                                  <DialogDescription>
                                    Detailed information about this activity log entry
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedLog && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium">Date & Time</label>
                                        <p className="text-sm text-muted-foreground font-mono">
                                          {formatDate(selectedLog.createdAt)}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Action</label>
                                        <p className="text-sm">
                                          <Badge variant={getActionVariant(selectedLog.action)}>
                                            {selectedLog.action}
                                          </Badge>
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">User</label>
                                        <p className="text-sm">{selectedLog.user.username} ({selectedLog.user.email})</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">IP Address</label>
                                        <p className="text-sm font-mono">{selectedLog.ipAddress || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Entity</label>
                                        <p className="text-sm">{selectedLog.entity || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Entity ID</label>
                                        <p className="text-sm font-mono">{selectedLog.entityId || 'N/A'}</p>
                                      </div>
                                    </div>

                                    {selectedLog.userAgent && (
                                      <div>
                                        <label className="text-sm font-medium">User Agent</label>
                                        <p className="text-sm text-muted-foreground break-all">
                                          {selectedLog.userAgent}
                                        </p>
                                      </div>
                                    )}

                                    {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                      <div>
                                        <label className="text-sm font-medium">Metadata</label>
                                        <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                                          {JSON.stringify(selectedLog.metadata, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-2 py-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {activityLogs.length} of {total} results
                  </p>
                  <Select
                    value={filters?.toString()}
                    onValueChange={(value) => handlePageSizeChange(parseInt(value))}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">per page</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= totalPages || isLoading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
        </CardContent>
      </Card>
    </div>
  )
}