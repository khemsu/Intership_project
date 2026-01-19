import React, { useState, useEffect } from "react";
import {
  Upload,
  Trash2,
  FileText,
  UserPlus,
  Settings,
  Eye,
  Menu,
  MessageSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import FileUpload from "@/components/FileUpload";
import CVList from "@/components/CVList";
import PromptEditor from "@/pages/PromptEditor";
import AdminAddUser from "@/components/AdminAddUser";
import Sidebar from "@/components/Sidebar";
import Chatbot from "@/components/Chatbot";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import logo from '@/assets/logo.svg';
import { Progress } from "@/components/ui/progress";

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface UploadStatus {
  isUploading: boolean;
  progress: number;
  currentFile: string | null;
}

const AdminDashboard = () => {
  // Get the last active tab from localStorage, default to "upload" if not found
  const getInitialTab = () => {
    try {
      return localStorage.getItem("adminActiveTab") || "upload";
    } catch (error) {
      console.warn("Failed to read from localStorage:", error);
      return "upload";
    }
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [cvCount, setCvCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isUploading: false,
    progress: 0,
    currentFile: null,
  });
  
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hello! I'm CBot. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    try {
      localStorage.setItem("adminActiveTab", newTab);
    } catch (error) {
      console.warn("Failed to save to localStorage:", error);
    }
  };
  const handleLogoClick = ()=>{
    handleTabChange("upload");
    setSidebarOpen(false);
  }

  // Optional: Clear the saved tab when logging out
  const handleLogout = () => {
    try {
      localStorage.removeItem("adminActiveTab");
    } catch (error) {
      console.warn("Failed to clear localStorage:", error);
    }
    logout();
    navigate("/login");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
      variant: "success",
      duration: 3000,
    });
  };

  const handleDeleteAll = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete all CVs? This action cannot be undone."
      )
    )
      return;

    setIsDeleting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/delete/all`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setCvCount(0);
        toast({ title: "Success", description: "All CVs deleted.", duration: 3000 });
      } else {
        throw new Error();
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete CVs.",
        variant: "error",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Enhanced cancel upload function that works from the dashboard level
  const cancelUpload = () => {
    setUploadStatus({
      isUploading: false,
      progress: 0,
      currentFile: null,
    });
    
    toast({
      title: "Upload Cancelled",
      description: "Upload has been cancelled from dashboard.",
      variant: "default",
      duration: 3000,
    });
  };

  const navigationItems = [
    { id: "upload", label: "Upload CVs", icon: Upload },
    { id: "manage", label: "View CVs", icon: Eye },
    { id: "users", label: "Manage Users", icon: UserPlus },
    { id: "prompt", label: "Prompts", icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "upload":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Upload CVs
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Upload single or multiple PDF CVs for automatic processing.
              </p>
            </div>
            <FileUpload
              onUploadSuccess={(count) => setCvCount((prev) => prev + count)}
              uploadStatus={uploadStatus}
              setUploadStatus={setUploadStatus}
            />
          </div>
        );
      case "manage":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                View CVs
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                View and manage uploaded CVs.
              </p>
            </div>
            <CVList
              onInitialLoad={(count) => setCvCount(count)}
              onDeleteSuccess={(count) =>
                setCvCount((prev) => Math.max(0, prev - count))
              }
            />
            <Card className="bg-white/80 dark:bg-slate-800/70 backdrop-blur-lg border border-red-100 dark:border-red-500/50 shadow-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="dark:text-red-100">
                  Delete all CVs permanently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAll}
                  disabled={isDeleting || cvCount === 0}
                  className=" border-red-500 transition-all rounded-lg px-4 py-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete All CVs
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      case "users":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Manage Users
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Add and manage user accounts.
              </p>
            </div>
            <AdminAddUser />
          </div>
        );
      case "prompt":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Prompts
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Configure LLM prompts and settings.
              </p>
            </div>
            <PromptEditor />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        navigationItems={navigationItems}
        activeTab={activeTab}
        onTabChange={handleTabChange} // Use the new handler
        user={user}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        appTitle="CvAnalyser"
        userRole="Admin"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
          <div
          className="flex items-center gap-2"
          onClick={handleLogoClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleLogoClick()}
          >
            <img src={logo} alt="CvAnalyser Logo" className="h-6 sm:h-6" />
          </div>
          <div className="w-10"></div>
        </div>

        {/* Background animations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute w-[500px] h-[500px] bg-indigo-300 blur-[150px] opacity-20 top-[-150px] left-[-100px] rounded-full"
            animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
            transition={{ duration: 12, repeat: Infinity }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] bg-blue-200 blur-[150px] opacity-20 bottom-[-150px] right-[-100px] rounded-full"
            animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative z-10">
          {renderContent()}
        </div>
      </div>

      {/* Enhanced Global Upload Progress Indicator */}
      <AnimatePresence>
        {uploadStatus.isUploading && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 shadow-xl rounded-xl p-4 border border-gray-200 dark:border-gray-700 w-80 backdrop-blur-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="animate-spin"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Upload className="w-5 h-5 text-blue-600" />
                </motion.div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Uploading Files
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {uploadStatus.progress}% complete
                  </p>
                </div>
              </div>
              
            </div>
            
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span className="truncate max-w-48">
                  {uploadStatus.currentFile}
                </span>
                <span>{uploadStatus.progress}%</span>
              </div>
              <Progress 
                value={uploadStatus.progress} 
                className="h-2 bg-gray-100 dark:bg-gray-700"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Processing your files...
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={cancelUpload}
                className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chatbot Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Button
          onClick={() => setIsChatbotOpen(true)}
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
        >
          <MessageSquare className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        </Button>
      </motion.div>

      {/* Chatbot Modal */}
      <AnimatePresence>
        {isChatbotOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setIsChatbotOpen(false)}
            />

            {/* Close Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-6 right-6 z-50"
            >
              <Button
                onClick={() => setIsChatbotOpen(false)}
                className="w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
              >
                <X className="w-6 h-6 text-white" />
              </Button>
            </motion.div>

            {/* Chatbot Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 100, y: 100 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 100, y: 100 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed z-50 
                         left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                         lg:left-auto lg:top-auto lg:translate-x-0 lg:translate-y-0 
                         lg:bottom-10 lg:right-16"
              style={{
                width: "min(400px, 90vw)",
                height: "min(600px, 80vh)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full h-full">
                <Chatbot 
                  messages={chatMessages}
                  onMessagesChange={setChatMessages}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;