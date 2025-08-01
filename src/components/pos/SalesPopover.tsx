"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  Settings,
  X,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import SalesOrderPage from '../sales/SalesOrderPage';
import { User } from '@/types/auth';


interface SalesPopoverProps {
  user: User | null;
}

export const SalesPopover: React.FC<SalesPopoverProps> = ({ user }) => {
  

  const [cartPanelOpen, setCartPanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Cart Panel Component
  const CartPanel = () => (
    <>
      {/* Backdrop */}
      {cartPanelOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setCartPanelOpen(false)}
        />
      )}

      {/* Slide-over Panel */}
      <div className={`
        fixed top-0 right-0 h-full bg-background border-l shadow-2xl z-50 transition-all duration-300 ease-in-out
        ${cartPanelOpen ? 'translate-x-0' : 'translate-x-full'}
        ${isFullscreen ? 'w-full' : 'w-[90vw] lg:w-[70vw] xl:w-[60vw]'}
      `}>
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5" />
            
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCartPanelOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
                 <SalesOrderPage user={user}/>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Main Action Buttons */}
      <div className="flex gap-3">
       
         
          <Button
            variant="outline"
            className="relative"
            onClick={() => setCartPanelOpen(true)}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            View Cart
           
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
       
      </div>

      {/* Cart Panel */}
      <CartPanel />
    </div>
  );
};

export default SalesPopover;