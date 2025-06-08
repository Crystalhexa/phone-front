"use client"

import * as React from "react"
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
  IconHelp,
  IconSearch,
  IconDatabase,
  IconReport,
  IconFileWord,
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
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { NavUser } from "@/components/nav-user"
import Link from "next/link"

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
      url: "/products",
      icon: IconFolder,
      items: [
        { title: "All Products", url: "/products/all" },
        { title: "Categories", url: "/products/categories" },
        { title: "Brands", url: "/products/brands" },
        { title: "Variants", url: "/products/variants" },
        { title: "Images", url: "/products/images" },
      ],
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: IconDatabase,
      items: [
        { title: "Inventory Overview", url: "/inventory/overview" },
        { title: "Stock Levels", url: "/inventory/stock" },
        { title: "Stock Logs", url: "/inventory/logs" },
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
            { title: "All Sales", url: "/orders/sales/all" },
            { title: "Pending", url: "/orders/sales/pending" },
            { title: "Completed", url: "/orders/sales/completed" },
          ],
        },
        {
          title: "Purchase Orders",
          url: "/orders/purchase",
          items: [
            { title: "All Purchases", url: "/orders/purchase/all" },
            { title: "Suppliers", url: "/orders/purchase/suppliers" },
          ],
        },
      ],
    },
    {
      title: "Transfers",
      url: "/transfers",
      icon: IconReport,
      items: [
        { title: "Transfer Requests", url: "/transfers/requests" },
        { title: "Deliveries", url: "/transfers/deliveries" },
        { title: "Logs", url: "/transfers/logs" },
      ],
    },
    {
      title: "Stores & Branches",
      url: "/locations",
      icon: IconInnerShadowTop,
      items: [
        { title: "Stores", url: "/locations/stores" },
        { title: "Branches", url: "/locations/branches" },
      ],
    },
    {
      title: "Customers",
      url: "/customers",
      icon: IconUsers,
      items: [
        { title: "All Customers", url: "/customers/all" },
        { title: "Reports", url: "/customers/reports" },
      ],
    },
    {
      title: "Employees & Users",
      url: "/people",
      icon: IconUsers,
      items: [
        { title: "Employees", url: "/people/employees" },
        { title: "Users", url: "/people/users" },
        { title: "Roles", url: "/people/roles" },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
      items: [{ title: "Preferences", url: "/settings/preferences" }],
    },
    { title: "Help", url: "/help", icon: IconHelp },
    { title: "Search", url: "/search", icon: IconSearch },
  ],
  documents: [
    {
      title: "Data Library",
      url: "/library",
      icon: IconDatabase,
      items: [{ title: "Schemas", url: "/library/schemas" }],
    },
    { title: "Reports", url: "/reports", icon: IconReport },
    { title: "Word Assistant", url: "/word", icon: IconFileWord },
  ],
}

// Recursive accordion renders both main and sub-navigation items,
// ensuring only one AccordionItem opens per level by using 'type="single"' and 'collapsible'.
function RecursiveAccordion({ item, depth = 0 }: { item: any; depth?: number }) {
  const pathname = usePathname()
  const Icon = item.icon
  const hasChildren = Array.isArray(item.items) && item.items.length > 0
  const isActive = pathname === item.url

  if (!hasChildren) {
    return (
     <Link
  href={item.url}
  className={clsx(
    "block w-full rounded px-3 py-2 text-sm hover:bg-muted transition-colors",
    depth > 0 && "pl-6 text-muted-foreground",
    isActive && "bg-muted font-semibold"
  )}
>
  {Icon && <Icon className="mr-2 inline-block h-4 w-4" />}
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
        {/* Sub-accordions: single open allowed */}
        <Accordion type="single" collapsible className="w-full">
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
        <div className="px-3 text-xs font-semibold text-muted-foreground">
          {title}
        </div>
      )}
      {/* Main navigation: only one open at a time */}
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

  if (!mounted) {
    return <div className="h-[40px]" /> // preserve layout
  }

  const isDark = theme === "dark"

  return (
    <div className="flex items-center justify-between px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        {isDark ? (
          <IconMoon className="h-4 w-4" />
        ) : (
          <IconSun className="h-4 w-4" />
        )}
        <span>Dark Mode</span>
      </div>
      <Switch
        checked={isDark}
        onCheckedChange={(val) => setTheme(val ? "dark" : "light")}
      />
    </div>
  )
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
            <Link href="/" className="flex items-center gap-2">
  <IconInnerShadowTop className="!size-5" />
  <span className="text-base font-semibold">Acme Inc.</span>
</Link>

            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        <NavGroup items={data.navMain} />
        <NavGroup title="Documents" items={data.documents} />
        <NavGroup items={data.navSecondary} />
        <ThemeToggler />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
