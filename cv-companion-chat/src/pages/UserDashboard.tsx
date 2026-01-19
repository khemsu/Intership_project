import React, { useState } from 'react';
import { MessageSquare, User, FileText, Menu } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Chatbot from '@/components/Chatbot';
import Sidebar from '@/components/Sidebar';
import { motion } from 'framer-motion';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
      variant: "success",
      duration: 3000
    });
  };

  const navigationItems = [
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                AI Assistant
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Chat with our AI assistant to get help with CVs and job applications.
              </p>
            </div>
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl shadow-xl border border-gray-300 dark:border-gray-700 p-6 min-h-[500px] transition-colors">
              <Chatbot />
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Profile
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Manage your account settings and preferences.
              </p>
            </div>
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl shadow-xl border border-gray-300 dark:border-gray-700 p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {user?.email}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">User Account</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Account Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Email:</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {user?.email}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Role:</span>
                      <span className="text-gray-900 dark:text-white font-medium">User</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Status:</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-tr from-[#e0f2fe] via-[#bae6fd] to-[#7dd3fc] dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#334155] transition-colors duration-500 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        navigationItems={navigationItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        appTitle="CvAnalyser"
        userRole="User"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              CvAnalyser
            </span>
          </div>
          
          <div className="w-10"></div> {/* Spacer for center alignment */}
        </div>

        {/* Background animations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute w-[400px] h-[400px] bg-green-300 blur-[100px] opacity-30 top-[-100px] left-[-50px] rounded-full"
            animate={{ x: [0, 20, 0], y: [0, 30, 0] }}
            transition={{ duration: 15, repeat: Infinity }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] bg-emerald-400 blur-[100px] opacity-30 bottom-[-120px] right-[-50px] rounded-full"
            animate={{ x: [0, -20, 0], y: [0, -30, 0] }}
            transition={{ duration: 13, repeat: Infinity }}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative z-10">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;