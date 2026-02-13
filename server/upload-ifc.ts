import { Router } from "express";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

export const uploadIfcRouter = Router();

uploadIfcRouter.post("/api/upload-ifc", async (req, res) => {
  try {
    const fileName = req.headers['x-file-name'] as string || 'model.ifc';
    const chunks: Buffer[] = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        
        // Generate unique file key
        const fileKey = `ifc-models/${nanoid()}-${fileName}`;
        
        // Upload to S3
        const result = await storagePut(fileKey, buffer, 'application/x-step');
        
        res.json({ 
          success: true, 
          url: result.url,
          key: result.key 
        });
      } catch (error: any) {
        console.error('Error uploading file:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message || 'Failed to upload file' 
        });
      }
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Request error' 
      });
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Unknown error' 
    });
  }
});
