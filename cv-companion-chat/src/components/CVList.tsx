import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { FileText, Search, Trash2, Download, Eye, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CV {
  name: string;
  contact: {
    email: string;
    phone: string;
    github?: string | null;
    linkedin?: string | null;
  };
  education?: Array<any>;
  work_experience?: Array<any>;
  skills?: string[];
  file_name: string;
}

interface CVListProps {
  onDeleteSuccess: (count: number) => void;
  onInitialLoad: (count: number) => void;
}

const fetchSignedUrl = async (fileName: string): Promise<string | null> => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/get-signed-url/${fileName}`
    );
    const data = await res.json();
    return data.url;
  } catch (error) {
    console.error("Failed to get signed URL", error);
    return null;
  }
};

const CVList = ({ onDeleteSuccess, onInitialLoad }: CVListProps) => {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCvs, setSelectedCvs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const fetchCVs = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/cvs`
        );
        if (!response.ok) throw new Error("Failed to fetch CVs");
        const data: CV[] = await response.json();
        setCvs(data);
        onInitialLoad(data.length);
      } catch (error) {
        console.error("Failed to fetch CVs:", error);
        toast({
          title: "Error",
          description: "Could not load CVs",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCVs();
  }, [onInitialLoad]);

  const filteredCvs = cvs.filter(
    (cv) =>
      cv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cv.contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cv.contact.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectCv = (fileName: string) => {
    const newSelected = new Set(selectedCvs);
    if (newSelected.has(fileName)) {
      newSelected.delete(fileName);
    } else {
      newSelected.add(fileName);
    }
    setSelectedCvs(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedCvs.size === 0) return;

    setIsDeleting(true);
    setShowDeleteDialog(false);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/cvs/delete`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: Array.from(selectedCvs) }),
        }
      );

      if (response.ok) {
        setCvs((prev) => prev.filter((cv) => !selectedCvs.has(cv.file_name)));
        onDeleteSuccess(selectedCvs.size);
        setSelectedCvs(new Set());
        toast({
          title: "Success",
          description: `${selectedCvs.size} CV(s) deleted successfully.`,
          variant: "default",
          duration: 5000,
        });
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete CVs. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white shadow-lg border-0">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Loading CVs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Actions */}
      <Card>
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <div className="border-b">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                CV Management
              </h1>
              <p className="text-slate-600">Manage uploaded CVs</p>
            </div>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {selectedCvs.size > 0 && (
                  <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isDeleting ? "Deleting..." : `Delete Selected (${selectedCvs.size})`}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          Confirm Deletion
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedCvs.size} CV{selectedCvs.size > 1 ? 's' : ''}? 
                          This action cannot be undone and will permanently remove the selected files from the system.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteSelected}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete {selectedCvs.size} CV{selectedCvs.size > 1 ? 's' : ''}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </div>

          <Card className="mx-4 my-4">
            {/* CV List */}
            <div className="grid gap-4">
              {filteredCvs.length === 0 ? (
                <Card className="bg-white shadow-lg border-0">
                  <CardContent className="p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {searchTerm
                        ? "No CVs found matching your search."
                        : "No CVs uploaded yet."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredCvs.map((cv) => (
                  <Card
                    key={cv.file_name}
                    className="bg-white shadow-lg hover:shadow-xl transition-shadow border-0"
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedCvs.has(cv.file_name)}
                          onChange={() => handleSelectCv(cv.file_name)}
                          className="mt-1 flex-shrink-0"
                        />

                        {/* File Icon */}
                        <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mt-1 flex-shrink-0" />

                        {/* Content Container */}
                        <div className="flex-1 min-w-0">
                          {/* Desktop Layout: justify-between */}
                          <div className="hidden sm:flex sm:items-start sm:justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="mb-3">
                                <h3 className="font-semibold text-gray-900 truncate">
                                  {cv.name}
                                </h3>
                                <p className="text-sm text-gray-600 truncate">
                                  {cv.contact.email}
                                </p>
                              </div>

                              {cv.skills && cv.skills.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {cv.skills.slice(0, 5).map((skill, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {skill}
                                    </Badge>
                                  ))}
                                  {cv.skills.length > 5 && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      +{cv.skills.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Desktop Action Buttons */}
                            <div className="flex gap-2 ml-4 flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const signedUrl = await fetchSignedUrl(
                                    cv.file_name
                                  );
                                  if (signedUrl) {
                                    window.open(signedUrl, "_blank");
                                  }
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const signedUrl = await fetchSignedUrl(
                                    cv.file_name
                                  );
                                  if (signedUrl) {
                                    const link = document.createElement("a");
                                    link.href = signedUrl;
                                    link.download = cv.file_name;
                                    link.click();
                                  }
                                }}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>

                          {/* Mobile Layout: stacked */}
                          <div className="sm:hidden">
                            <div className="mb-3">
                              <h3 className="font-semibold text-gray-900 break-words">
                                {cv.name}
                              </h3>
                              <p className="text-sm text-gray-600 break-words">
                                {cv.contact.email}
                              </p>
                            </div>

                            {cv.skills && cv.skills.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {cv.skills.slice(0, 3).map((skill, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                                {cv.skills.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{cv.skills.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Mobile Action Buttons */}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={async () => {
                                  const signedUrl = await fetchSignedUrl(
                                    cv.file_name
                                  );
                                  if (signedUrl) {
                                    window.open(signedUrl, "_blank");
                                  }
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={async () => {
                                  const signedUrl = await fetchSignedUrl(
                                    cv.file_name
                                  );
                                  if (signedUrl) {
                                    const link = document.createElement("a");
                                    link.href = signedUrl;
                                    link.download = cv.file_name;
                                    link.click();
                                  }
                                }}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
};

export default CVList;