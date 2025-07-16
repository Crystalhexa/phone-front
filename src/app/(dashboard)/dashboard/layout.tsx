import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import StoreProvider from "@/state/redux";
type Props = {
  children: React.ReactNode;
};

const Layout = async ({ children }: Props) => {
  return (

      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          {children}
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
   
  )
}
export default Layout;