import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
type Props = {
  children: React.ReactNode;
};

const Layout = async ({   children }: Props) => {  
  return (
    
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
     {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
export default Layout;