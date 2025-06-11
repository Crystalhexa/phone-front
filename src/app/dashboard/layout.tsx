import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ToastContainer } from "react-toastify";
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
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar newestOnTop />
    </SidebarProvider>
  )
}
export default Layout;