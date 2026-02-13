import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileUp, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useIfcModel } from "@/contexts/IfcModelContext";
import type { IfcModel } from "@/services/ifcGeometryLoader";


interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileProcessed?: (result: any) => void;
}

export function FileUploadDialog({ open, onOpenChange, onFileProcessed }: FileUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const processFileMutation = trpc.ifc.processFile.useMutation();
  const { setCurrentModel } = useIfcModel();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.ifc')) {
        toast.error("Please select an IFC file (.ifc)");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.name.toLowerCase().endsWith('.ifc')) {
        toast.error("Please select an IFC file (.ifc)");
        return;
      }
      setFile(droppedFile);
      setError(null);
      setResult(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Upload to S3
      toast.info("Uploading file to storage...");
      const uploadResult = await fetch('/api/upload-ifc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': file.name,
        },
        body: uint8Array,
      });

      if (!uploadResult.ok) {
        throw new Error('Failed to upload file');
      }

      const { url } = await uploadResult.json();
      
      setUploading(false);
      setProcessing(true);
      toast.info("Processing IFC file...");

      // Process IFC file with geometry
      const processResult = await processFileMutation.mutateAsync({
        fileUrl: url,
        includeGeometry: true, // Incluir geometría para visualización 3D
      });

      setProcessing(false);

      if (processResult.success) {
        setResult(processResult);
        
        // Guardar modelo en contexto global para visualización 3D
        const ifcModel: IfcModel = {
          elements: processResult.elements || [],
        };
        
        setCurrentModel(ifcModel, {
          schema: processResult.schema,
          fileUrl: url,
          fileName: file.name,
          statistics: processResult.statistics,
        });
        
        toast.success("IFC file processed successfully!");
        onFileProcessed?.(processResult);
      } else {
        setError(processResult.error || "Failed to process IFC file");
        toast.error("Failed to process IFC file");
      }
    } catch (err: any) {
      setUploading(false);
      setProcessing(false);
      setError(err.message || "An error occurred");
      toast.error("Error processing file");
      console.error("Upload error:", err);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setUploading(false);
    setProcessing(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload IFC File</DialogTitle>
          <DialogDescription>
            Upload an IFC file to extract BIM data and analyze the model
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!file && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <FileUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your IFC file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports IFC2x3 and IFC4 formats
              </p>
              <input
                id="file-input"
                type="file"
                accept=".ifc"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {file && !result && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileUp className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                {!uploading && !processing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </Button>
                )}
              </div>

              {(uploading || processing) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {uploading ? "Uploading..." : "Processing IFC file..."}
                  </span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              {!uploading && !processing && !error && (
                <Button
                  onClick={handleUpload}
                  className="w-full"
                  disabled={uploading || processing}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Process IFC File
                </Button>
              )}
            </div>
          )}

          {result && result.success && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">File processed successfully!</span>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-2">Model Information</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Schema:</span> {result.schema}</p>
                    <p><span className="text-muted-foreground">Total Elements:</span> {result.statistics.totalElements}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Elements by Type</h4>
                  <div className="text-sm space-y-1">
                    {Object.entries(result.statistics.elementsByType).map(([type, count]) => (
                      <p key={type}>
                        <span className="text-muted-foreground">{type}:</span> {count as number}
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Extracted {result.elements.length} sample elements
                  </p>
                </div>
              </div>

              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
