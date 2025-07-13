import { PosSidebar } from "@/components/pos/PosSidebar";
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import StoreProvider from "@/state/redux";
type Props = {
  children: React.ReactNode;
};

const Layout = async ({ children }: Props) => {
  return (
    <StoreProvider>
      <SidebarProvider>
        <PosSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          {children}
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </StoreProvider>
  )
}
export default Layout;