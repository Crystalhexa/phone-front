"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import clsx from "clsx"
import {
  IconChevronDown,
  IconMoon,
  IconSun,
  IconDashboard,
  IconListDetails,
  IconFolder,
  IconUsers,
  IconSettings,
  IconDatabase,
  IconReport,
  IconInnerShadowTop,
} from "@tabler/icons-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { NavUser } from "@/components/nav-user"
import { Building, ShoppingCart } from "lucide-react"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
      items: [
        { title: "Overview", url: "/dashboard" },
        { title: "Stats", url: "/dashboard/stats" },
      ],
    },
    {
      title: "Products",
      url: "/dashboard/products",
      icon: IconFolder,
      items: [
        { title: "All Products", url: "/dashboard/products/all" },
        { title: "Categories", url: "/dashboard/products/categories", },
        { title: "Brands", url: "/dashboard/products/brands" },
      ],
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: IconDatabase,
      items: [
        { title: "Inventory Overview", url: "/dashboard/inventory/overview" },
        { title: "Stock Levels", url: "/dashboard/inventory/stock-level" },
        { title: "Stock Logs", url: "/dashboard/inventory/stock-logs" },
      ],
    },
    {
      title: "Orders",
      url: "/orders",
      icon: IconListDetails,
      items: [
        {
          title: "Sales Orders",
          url: "/orders/sales",
          items: [
            { title: "All Sales", url: "/dashboard/orders/sales" },
            { title: "Pending", url: "/orders/sales/pending" },
            { title: "Completed", url: "/orders/sales/completed" },
          ],
        },
        {
          title: "Purchase Orders",
          url: "/orders/purchase",
          items: [
            { title: "All Purchases", url: "/dashboard/orders/purchase/all" },
            { title: "Suppliers", url: "/dashboard/orders/purchase/suppliers" },
          ],
        },
      ],
    },
    {
      title: "Transfers",
      url: "/transfers",
      icon: IconReport,
      items: [
        { title: "Transfer Requests", url: "/dashboard/transfer/transection" },
        { title: "Deliveries", url: "/transfers/deliveries" },
        { title: "Logs", url: "/transfers/logs" },
      ],
    },
    {
      title: "Stores & Branches",
      url: "/locations",
      icon: IconInnerShadowTop,
      items: [
        { title: "Branches", url: "/dashboard/branches/view" },
      ],
    },
    {
      title: "Customers",
      url: "/customers",
      icon: IconUsers,
      items: [
        { title: "All Customers", url: "/dashboard/customers" },
        { title: "Reports", url: "/dashboard/customers/reports" },
      ],
    },
    {
      title: "Employees & Users",
      url: "/people",
      icon: IconUsers,
      items: [
        { title: "Employees", url: "/dashboard/user/employees" },
        { title: "Roles", url: "/dashboard/user/roles" },
        { title: "Logs", url: "/dashboard/user/logs" },
      ],
    },
       {
      title: "Branch",
      url: "/branch",
      icon: Building,
      items: [
        { title: "POS", url: "/dashboard/branch/pos" },
        { title: "Cashier", url: "/dashboard/branch/cash" },
        { title: "Return", url: "/dashboard/branch/return" },
                { title: "Initial-stock", url: "/dashboard/branch/initial-stock" },
      ],
    }
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
  ],
  documents: [
    { title: "Reports", url: "/dashboard/reports", icon: IconReport },
  ],
}

function RecursiveAccordion({ item, depth = 0 }: { item: any; depth?: number }) {
  const pathname = usePathname()
  const Icon = item.icon
  const hasChildren = Array.isArray(item.items) && item.items.length > 0
  const isActive = pathname === item.url || pathname.startsWith(item.url + "/")

  if (!hasChildren) {
    return (
      <Link
        href={item.url}
        aria-current={isActive ? "page" : undefined}
        className={clsx(
          "flex items-center rounded px-3 py-2 text-sm hover:bg-muted transition-colors",
          depth > 0 && "pl-6 text-muted-foreground",
          isActive && "bg-muted font-semibold"
        )}
      >
        {Icon ? (
          <Icon className="mr-2 h-4 w-4" />
        ) : (
          <span className="mr-2 h-4 w-4 inline-block" />
        )}
        {item.title}
      </Link>
    )
  }


  return (
    <AccordionItem value={item.title} className={depth === 0 ? "px-2" : "pl-6"}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-2 w-full">
          {Icon && <Icon className="h-4 w-4" />}
          <span className="flex-1 text-left">{item.title}</span>
          <IconChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <Accordion type="single" collapsible defaultValue={item.items.find((child: any) => pathname.startsWith(child.url))?.title}>
          {item.items.map((child: any, idx: number) => (
            <RecursiveAccordion key={idx} item={child} depth={depth + 1} />
          ))}
        </Accordion>
      </AccordionContent>
    </AccordionItem>
  )
}

function NavGroup({ title, items }: { title?: string; items: any[] }) {
  return (
    <div className="space-y-1">
      {title && (
        <div className="px-3 pt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </div>
      )}
      <Accordion type="single" collapsible className="w-full">
        {items.map((item, idx) => (
          <RecursiveAccordion key={idx} item={item} />
        ))}
      </Accordion>
    </div>
  )
}

function ThemeToggler() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="h-[40px]" />

  const isDark = theme === "dark"

  return (
    <div className="flex items-center justify-between px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        {isDark ? <IconMoon className="h-4 w-4" /> : <IconSun className="h-4 w-4" />}
        <span>Dark Mode</span>
      </div>
      <Switch
        checked={isDark}
        onCheckedChange={(val) => setTheme(val ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
    </div>
  )
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <Sidebar collapsible="offcanvas" {...props} className={clsx({ "w-16": collapsed })}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-between w-full">
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/" className="flex items-center gap-2">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Acme Inc.</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="overflow-y-auto space-y-4 px-1.5 py-3">
        <NavGroup items={data.navMain} />
        <div className="border-t border-border mx-2" />
        <NavGroup title="Documents" items={data.documents} />
        <div className="border-t border-border mx-2" />
        <NavGroup items={data.navSecondary} />
        <ThemeToggler />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
