import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, X, Check, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FileUploadProps {
  onUploadSuccess: (count: number) => void;
  uploadStatus: {
    isUploading: boolean;
    progress: number;
    currentFile: string | null;
  };
  setUploadStatus: React.Dispatch<React.SetStateAction<{
    isUploading: boolean;
    progress: number;
    currentFile: string | null;
  }>>;
}

const FileUpload = ({ 
  onUploadSuccess,
  uploadStatus,
  setUploadStatus
}: FileUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add state for the overwrite dialog (single upload only)
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [overwritePersonName, setOverwritePersonName] = useState("");
  const [overwriteResolve, setOverwriteResolve] = useState<((value: boolean) => void) | null>(null);
  
  // Add AbortController ref for canceling uploads
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function - only for manual cancellation
  const cleanupUpload = () => {
    // Clear interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    // Abort current request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Reset upload status
    setUploadStatus({
      isUploading: false,
      progress: 0,
      currentFile: null,
    });
  };

  // Separate cleanup for component unmount - doesn't abort uploads
  const cleanupOnUnmount = () => {
    // Only clear intervals and refs, don't abort or reset status
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    if (abortControllerRef.current) {
      // Don't abort - let upload continue
      abortControllerRef.current = null;
    }
  };

  // Only cleanup on unmount, not on component changes
  useEffect(() => {
    return () => {
      // Only cleanup intervals and refs on unmount
      // Don't abort uploads or reset status - let them continue
      cleanupOnUnmount();
    };
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileSelect(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFileSelect(selectedFiles);
  };

  const handleFileSelect = (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter((file) => {
      const isValid = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "image/jpg",
      ].includes(file.type);

      if (!isValid) {
        toast({
          title: "Error",
          description: `${file.name} is not a supported file type.`,
          variant: "error",
        });
      }
      return isValid;
    });

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Enhanced cancel upload function
  const cancelUpload = () => {
    console.log("Cancelling upload...");
    cleanupUpload();
    
    toast({
      title: "Upload Cancelled",
      description: "Upload has been cancelled.",
      variant: "default",
      duration: 3000,
    });
  };

  // Updated promptForOverwrite function using AlertDialog
  const promptForOverwrite = async (name: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setOverwritePersonName(name);
      setOverwriteResolve(() => resolve);
      setShowOverwriteDialog(true);
    });
  };

  // Handle overwrite dialog actions (single upload only)
  const handleOverwriteConfirm = () => {
    setShowOverwriteDialog(false);
    if (overwriteResolve) {
      overwriteResolve(true);
      setOverwriteResolve(null);
    }
  };

  const handleOverwriteCancel = () => {
    setShowOverwriteDialog(false);
    if (overwriteResolve) {
      overwriteResolve(false);
      setOverwriteResolve(null);
    }
  };

  const uploadSingleFile = async (fileIndex: number) => {
    // Enhanced check to prevent multiple uploads
    if (uploadStatus.isUploading || fileIndex >= files.length) {
      console.log("Upload blocked: isUploading =", uploadStatus.isUploading, "fileIndex =", fileIndex, "files.length =", files.length);
      return;
    }
    
    const file = files[fileIndex];
    console.log("Starting upload for:", file.name);
    
    // Reset any existing intervals and controllers
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Create new AbortController for this upload
    abortControllerRef.current = new AbortController();
    
    setUploadStatus({
      isUploading: true,
      progress: 0,
      currentFile: file.name,
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      // Simulate progress updates
      progressIntervalRef.current = setInterval(() => {
        setUploadStatus(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }));
      }, 500);

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      console.log("Making request to:", `${API_BASE_URL}/api/upload/single?force_update=false`);

      const checkRes = await fetch(
        `${API_BASE_URL}/api/upload/single?force_update=false`,
        {
          method: "POST",
          body: formData,
          credentials: 'include',
          signal: abortControllerRef.current.signal,
        }
      );

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      console.log("Response status:", checkRes.status);
      const result = await checkRes.json();
      console.log("Response data:", result);

      // Check for duplicate using status field or message
      if (checkRes.ok && (result.status === "duplicate" || (result.message && result.message.includes("already exists")))) {
        console.log("Detected duplicate, prompting for overwrite");
        const personName = result.person_name || (result.message.match(/'([^']+)'/)?.[1]) || "this person";
        
        const shouldUpdate = await promptForOverwrite(personName);
        
        if (shouldUpdate) {
          console.log("User chose to update, uploading with force_update=true");
          const updateForm = new FormData();
          updateForm.append("file", file);
          
          const updateRes = await fetch(
            `${API_BASE_URL}/api/upload/single?force_update=true`,
            {
              method: "POST",
              body: updateForm,
              credentials: 'include',
              signal: abortControllerRef.current.signal,
            }
          );
          
          const updateResult = await updateRes.json();
          console.log("Update response:", updateResult);
          
          if (updateRes.ok) {
            toast({
              title: "Success",
              description: "CV updated successfully!",
              variant: "success",
              duration: 3000,
            });
          } else {
            throw new Error(updateResult.detail || "Failed to update CV");
          }
        } else {
          console.log("User chose to skip");
          toast({
            title: "CV upload skipped.",
            variant: "default",
            duration: 3000,
          });
        }
      } else if (checkRes.ok && result.status === "success") {
        console.log("New CV uploaded successfully");
        toast({
          title: "CV uploaded successfully!",
          variant: "success",
          duration: 3000,
        });
      } else {
        console.error("Upload failed:", result);
        throw new Error(result.detail || result.message || "Upload failed");
      }

      setFiles((prev) => prev.filter((_, i) => i !== fileIndex));
      onUploadSuccess(1);
      
      // Always reset upload status at the end
      setUploadStatus({
        isUploading: false,
        progress: 100,
        currentFile: null,
      });
      
      // Reset progress after showing completion
      setTimeout(() => {
        setUploadStatus(prev => ({
          ...prev,
          progress: 0,
        }));
      }, 1000);
      
    } catch (error: any) {
      console.log("Error in uploadSingleFile:", error);
      
      // Clean up on error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Don't show error if upload was cancelled
      if (error.name === 'AbortError') {
        console.log("Upload was cancelled");
        // Still reset upload status even if cancelled
        setUploadStatus({
          isUploading: false,
          progress: 0,
          currentFile: null,
        });
        return;
      }
      
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: error.message || "Error during upload. Please try again.",
        variant: "error",
        duration: 3000,
      });
      
      // Always reset upload status on error
      setUploadStatus({
        isUploading: false,
        progress: 0,
        currentFile: null,
      });
    }
  };

  const uploadAllFiles = async () => {
    if (files.length === 0 || uploadStatus.isUploading) {
      console.log("Bulk upload blocked: files.length =", files.length, "isUploading =", uploadStatus.isUploading);
      return;
    }
    
    // Reset any existing intervals and controllers
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Create new AbortController for this upload
    abortControllerRef.current = new AbortController();
    
    setUploadStatus({
      isUploading: true,
      progress: 0,
      currentFile: "Multiple files...",
    });

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      
      // Simulate progress updates
      progressIntervalRef.current = setInterval(() => {
        setUploadStatus(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 5, 90),
        }));
      }, 500);

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      
      // Auto-replace: directly upload with force_update=true for bulk uploads
      const response = await fetch(
        `${API_BASE_URL}/api/upload/bulk?force_update=true`,
        {
          method: "POST",
          body: formData,
          credentials: 'include',
          signal: abortControllerRef.current.signal,
        }
      );

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      const result = await response.json();
      const fileResults = Array.isArray(result) ? result : [];

      const uploaded = fileResults.filter((r: any) => r.status === "success");
      const failed = fileResults.filter((r: any) => r.status === "failed");

      // Create summary message
      let summary = [];
      if (uploaded.length) {
        summary.push(`${uploaded.length} files processed successfully`);
      }
      if (failed.length) {
        summary.push(`${failed.length} failed`);
      }

      toast({
        title: "Bulk Upload Complete",
        description: summary.join(", ") || "No files processed.",
        variant: uploaded.length > 0 ? "success" : "error",
        duration: 5000,
      });

      setFiles([]);
      onUploadSuccess(uploaded.length);
      
      // Always reset upload status at the end
      setUploadStatus({
        isUploading: false,
        progress: 100,
        currentFile: null,
      });
      
      // Reset progress after showing completion
      setTimeout(() => {
        setUploadStatus(prev => ({
          ...prev,
          progress: 0,
        }));
      }, 1000);
      
    } catch (error: any) {
      console.log("Error in uploadAllFiles:", error);
      
      // Clean up on error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Don't show error if upload was cancelled
      if (error.name === 'AbortError') {
        console.log("Bulk upload was cancelled");
        // Still reset upload status even if cancelled
        setUploadStatus({
          isUploading: false,
          progress: 0,
          currentFile: null,
        });
        return;
      }
      
      console.error(error);
      toast({
        title: "Error",
        description: "Error during bulk upload. Please try again.",
        variant: "error",
        duration: 3000,
      });
      
      // Always reset upload status on error
      setUploadStatus({
        isUploading: false,
        progress: 0,
        currentFile: null,
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <>
      <Card>
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              CV Upload Block
            </h1>
            <p className="text-slate-600">
              Add single or multiple CVs for automatic processing.
            </p>
          </div>

          {/* Upload Progress */}
          {uploadStatus.isUploading && (
            <Card className="mb-6 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Uploading: {uploadStatus.currentFile}</span>
                  <span className="text-sm text-blue-600">{uploadStatus.progress}%</span>
                </div>
                <Progress value={uploadStatus.progress} className="mb-2" />
              </CardContent>
            </Card>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-slate-300 bg-white hover:border-slate-400"
            }`}
          >
            <CardContent className="p-8 md:p-12">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                  Drop your CV files here or click to browse
                </h3>
                <p className="text-slate-500">
                  Supports PDF, DOC, DOCX, JPG, PNG files.
                </p>
              </div>
            </CardContent>
          </div>

          {/* Files List */}
          {files.length > 0 && (
            <Card className="bg-white shadow-lg mt-6">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <CardTitle>Files to Upload ({files.length})</CardTitle>
                  <div className="flex gap-2">
                    {uploadStatus.isUploading && (
                      <Button
                        onClick={cancelUpload}
                        variant="outline"
                        className="border-red-500 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                    <Button
                      onClick={uploadAllFiles}
                      disabled={uploadStatus.isUploading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {uploadStatus.isUploading ? "Uploading..." : "Upload All"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {files.map((file, index) => (
                    <div
                      key={file.name + index}
                      className="border rounded-lg p-4 bg-white"
                    >
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate">
                              {file.name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => uploadSingleFile(index)}
                            disabled={uploadStatus.isUploading}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {uploadStatus.isUploading ? "Uploading..." : "Upload"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFile(index)}
                            className="text-slate-500 hover:text-red-600"
                            disabled={uploadStatus.isUploading}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guidelines */}
          <Card className="bg-blue-50 border-blue-400 mt-6">
            <CardHeader>
              <CardTitle className="text-blue-800">Upload Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5" /> PDF, DOC, DOCX, JPG, PNG supported
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5" /> Max 10MB per file
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5" /> Ensure CVs are readable
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </Card>

      {/* Overwrite Confirmation Dialog - Single Upload Only */}
      <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              CV Already Exists
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              A CV for <span className="font-semibold text-slate-800">"{overwritePersonName}"</span> already exists in the system.
              <br /><br />
              Do you want to update it with the new file?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              onClick={handleOverwriteCancel}
              className="w-full sm:w-auto"
            >
              Skip Upload
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleOverwriteConfirm}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              Update CV
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FileUpload;