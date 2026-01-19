import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Save, Edit3, Eye, EyeOff } from "lucide-react";

export default function PromptEditor() {
  const [promptIds, setPromptIds] = useState<string[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [promptContent, setPromptContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch prompt IDs on mount
  useEffect(() => {
    async function fetchPromptIds() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/prompts`
        );
        if (!res.ok) throw new Error("Failed to fetch prompt IDs");
        const data = await res.json();
        setPromptIds(data);
        if (data.length > 0) setSelectedPromptId(data[0]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchPromptIds();
  }, []);

  // Fetch prompt content when selection changes
  useEffect(() => {
    if (!selectedPromptId) {
      setPromptContent("");
      return;
    }

    async function fetchPromptContent() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/prompt/${selectedPromptId}`
        );
        if (!res.ok) throw new Error("Failed to fetch prompt content");
        const data = await res.json();
        setPromptContent(data.content || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchPromptContent();
  }, [selectedPromptId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/prompt/update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt_id: selectedPromptId,
            content: promptContent,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to save prompt");
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const getCategoryFromId = (id: string) => {
    if (id.toLowerCase().includes("interview")) return "interview";
    if (
      id.toLowerCase().includes("cv") ||
      id.toLowerCase().includes("analysis")
    )
      return "cv_analysis";
    if (id.toLowerCase().includes("screening")) return "screening";
    return "general";
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "cv_analysis":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "interview":
        return "bg-green-100 text-green-800 border-green-200";
      case "screening":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "general":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatPromptName = (id: string) => {
    return id
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <Card>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Prompt Management
          </h1>
          <p className="text-slate-600">
            Manage AI prompts for different use cases
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Prompts List */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5" />
                Prompts
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="space-y-3">
                  {Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className="h-16 bg-slate-200 rounded animate-pulse"
                      ></div>
                    ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {promptIds.map((id) => {
                    const category = getCategoryFromId(id);
                    const isSelected = selectedPromptId === id;

                    return (
                      <div
                        key={id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                        onClick={() => {
                          setSelectedPromptId(id);
                          setIsEditing(false);
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-slate-800 truncate">
                            {formatPromptName(id)}
                          </h3>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-green-600" />
                          </div>
                        </div>
                        <Badge className={getCategoryColor(category)}>
                          {category.replace("_", " ")}
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {promptContent
                            ? `${promptContent.substring(0, 100)}...`
                            : "Loading..."}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prompt Editor */}
          <div className="lg:col-span-2">
            {selectedPromptId ? (
              <Card className="h-fit">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Edit3 className="w-5 h-5" />
                        {formatPromptName(selectedPromptId)}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          className={getCategoryColor(
                            getCategoryFromId(selectedPromptId)
                          )}
                        >
                          {getCategoryFromId(selectedPromptId).replace(
                            "_",
                            " "
                          )}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? "Saving..." : "Save"}
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => setIsEditing(true)}
                          disabled={loading}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm font-medium">
                        {error}
                      </p>
                    </div>
                  )}

                  {isEditing ? (
                    <div>
                      <Textarea
                        value={promptContent}
                        onChange={(e) => setPromptContent(e.target.value)}
                        className="h-[450px] resize-none font-mono text-sm"
                        disabled={loading || saving}
                        spellCheck={false}
                        placeholder="Enter prompt content..."
                      />
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-4 h-[450px] overflow-y-auto">
                      {loading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-slate-500">Loading...</div>
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono leading-relaxed">
                          {promptContent || "No content available"}
                        </pre>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-fit">
                <CardContent className="flex items-center justify-center h-[600px]">
                  <div className="text-center text-slate-500">
                    <BrainCircuit className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>Select a prompt to view or edit</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        
      </div>
    </Card>
  );
}
