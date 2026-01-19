import React, { useState, useRef } from 'react';
import { Upload, Trash2, MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import FileUpload from '@/components/FileUpload';
import CVList from '@/components/CVList';
import Chatbot from '@/components/Chatbot';

const Index = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [cvCount, setCvCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleInitialLoad = (count) => {
    console.log('Loaded CV count:', count);
    setCvCount(count);
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all CVs? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/cvs/delete/all`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCvCount(0);
        toast({
          title: "Success",
          description: "All CVs have been deleted successfully.",
          variant: "success",
          duration: 3000,
        });
      } else {
        throw new Error('Failed to delete CVs');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete CVs. Please try again.",
        variant: "error",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            CV Management Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Upload, manage, and analyze CVs with intelligent insights
          </p>
        </div>
        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm border">
            <TabsTrigger 
              value="upload" 
              className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
            >
              <Upload className="w-4 h-4" />
              Upload CVs
            </TabsTrigger>
            <TabsTrigger 
              value="manage" 
              className="flex items-center gap-2 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700"
            >
              <FileText className="w-4 h-4" />
              Manage CVs
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="flex items-center gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700"
            >
              <MessageSquare className="w-4 h-4" />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <FileUpload onUploadSuccess={(count) => setCvCount(prev => prev + count)} />
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <CVList
              onDeleteSuccess={(count) => setCvCount(prev => Math.max(0, prev - count))}
              onInitialLoad={handleInitialLoad}
            />
            {/* Delete All Section */}
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Permanently delete all CVs from the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAll}
                  disabled={isDeleting || cvCount === 0}
                  className="bg-red-500 hover:bg-red-600"
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
          </TabsContent>

          <TabsContent value="chat">
            <Chatbot />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
