import React from "react";
import { LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import logo from '@/assets/logo.svg';
interface NavigationItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface SidebarProps {
  navigationItems: NavigationItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  user?: {
    email: string;
  };
  onLogout: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  appTitle?: string;
  appRole?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  navigationItems,
  activeTab,
  onTabChange,
  user,
  onLogout,
  sidebarOpen,
  setSidebarOpen,
  appTitle = "CvAnalyser",
  appRole = "Recruitment Engine",
}) => {
  
  const handleLogoClick = () => {
    onTabChange("upload");
  };
  const handleNavClick = (tabId: string) => {
    onTabChange(tabId);
    setSidebarOpen(false); 
  };

  const SidebarContent = () => (
    <>
      {/* Logo and Brand */}
      <div className="p-6 border-b border-border">
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleLogoClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleLogoClick()}
        >
          <img
            src={logo}
            alt="CvAnalyser Logo"
            className="h-8 sm:h-10"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col h-full p-2">
        <nav className="flex-1 px-2 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center w-full px-4 py-3 text-md font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Info and Logout */}
        <div className="p-4 border-t border-border mt-auto">
          <div className="mb-4 text-sm">
            <div className="font-medium text-foreground">
              Welcome back
            </div>
            <div className="truncate text-muted-foreground">{user?.email}</div>
          </div>
          <Button
            variant="outline"
            className="w-full flex items-center gap-2 justify-center"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 bg-background shadow-lg border-r border-border flex-col">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Mobile Sidebar */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed left-0 top-0 h-full w-72 bg-background shadow-lg z-50 flex flex-col lg:hidden"
            >
              {/* Close Button */}
              <div className="flex justify-end p-4 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 flex flex-col">
                <SidebarContent />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
