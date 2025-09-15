'use client'
import { useEffect } from "react"
import { Separator } from "../components/ui/separator"
import { SidebarTrigger } from "../components/ui/sidebar"

export function SiteHeader() {

  const handleFullscreen = () => {
    const elem = document.documentElement;

    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen(); // Safari
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen(); // IE11
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen(); // Safari
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen(); // IE11
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {

      if ((e.ctrlKey || e.metaKey) && e.key=== "f") {
        e.preventDefault();
        handleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Documents</h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleFullscreen} title="Toggle Fullscreen (F11 or Ctrl+Shift+F)">
            ⛶
          </button>
        </div>
      </div>
    </header>
  )
}
