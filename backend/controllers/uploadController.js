import mongoose from "mongoose";
import path from "path";
import File from "../models/File.js";
import ChannelMessage from "../models/ChannelMessage.js";
import Message from "../models/Message.js";
import getChannelAccess from "../utils/channelAccess.js";
import {
  uploadOnCloudinary,
  generateCloudinaryDownloadUrl,
  generateCloudinarySignedUrl,
} from "../utils/cloudinary.js";

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype || "";
    const size = req.file.size;
    const ext = path.extname(originalName).replace(".", "").toLowerCase();

    const result = await uploadOnCloudinary(req.file.path, {
      originalName,
      mimeType,
    });

    if (!result) {
      return res.status(500).json({
        message: "Failed to upload file to Cloudinary. Please check your credentials.",
      });
    }

    const savedFile = await File.create({
      originalName,
      url: result.secure_url || result.url,
      previewUrl: result.previewUrl || "",
      publicId: result.public_id,
      resourceType: result.resourceType || result.resource_type || "auto",
      format: result.format || ext,
      size: result.bytes || size,
      mimeType,
      extension: ext,
      uploadedBy: req.userId,
    });

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      file: {
        id: savedFile._id,
        fileId: savedFile._id,
        originalName: savedFile.originalName,
        url: savedFile.url,
        previewUrl: savedFile.previewUrl,
        publicId: savedFile.publicId,
        resourceType: savedFile.resourceType,
        format: savedFile.format,
        size: savedFile.size,
        mimeType: savedFile.mimeType,
        extension: savedFile.extension,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to upload file. Please try again later.",
    });
  }
};

export const getFileById = async (req, res) => {
  try {
    const file = await File.findById(req.params.id).lean();
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    return res.status(200).json({ success: true, file });
  } catch {
    return res.status(500).json({ message: "Failed to fetch file details" });
  }
};

export const downloadOrViewFile = async (req, res) => {
  try {
    let file = null;
    const fileId = req.params.id || req.query.id || req.query.fileId;
    const fileUrlParam = req.query.url;

    if (fileId && mongoose.isValidObjectId(fileId)) {
      file = await File.findById(fileId);
    } else if (fileUrlParam) {
      file = await File.findOne({
        $or: [{ url: fileUrlParam }, { previewUrl: fileUrlParam }],
      });
    }

    if (!file && fileUrlParam) {
      // Synthesize file metadata if it's a Cloudinary URL
      const decodedUrl = decodeURIComponent(fileUrlParam);
      const isPdf = decodedUrl.toLowerCase().includes(".pdf");
      const match = decodedUrl.match(/\/upload\/(?:(?:s--[^/]+--\/)?(?:v\d+\/)?)?([^/?#]+)/);
      const publicIdWithExt = match ? match[1] : "";
      const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
      if (publicId) {
        file = {
          originalName: publicIdWithExt || (isPdf ? "document.pdf" : "file"),
          publicId,
          resourceType: decodedUrl.includes("/image/upload/") ? "image" : "raw",
          extension: isPdf ? "pdf" : (publicIdWithExt.split(".").pop() || ""),
          mimeType: isPdf ? "application/pdf" : "application/octet-stream",
          url: decodedUrl,
        };
      }
    }

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Determine target candidate URLs for retrieval from Cloudinary
    const candidateUrls = [];
    const isPdf = file.extension === "pdf" || file.mimeType === "application/pdf";

    if (isPdf) {
      const downloadUrl = generateCloudinaryDownloadUrl(file.publicId, file.resourceType || "image", "pdf");
      if (downloadUrl) candidateUrls.push(downloadUrl);

      const signedUrl = generateCloudinarySignedUrl(file.publicId, file.resourceType || "image", "pdf");
      if (signedUrl) candidateUrls.push(signedUrl);
    } else {
      const downloadUrl = generateCloudinaryDownloadUrl(file.publicId, file.resourceType || "raw", file.extension || "");
      if (downloadUrl) candidateUrls.push(downloadUrl);
    }

    if (file.url) candidateUrls.push(file.url);

    let response = null;
    for (const fetchUrl of candidateUrls) {
      try {
        const resCandidate = await fetch(fetchUrl);
        if (resCandidate.ok) {
          response = resCandidate;
          break;
        }
      } catch {
        // Continue to next candidate
      }
    }

    if (!response || !response.ok) {
      return res.status(404).json({ message: "Failed to fetch file from storage" });
    }

    const data = await response.arrayBuffer();
    const isView = req.query.action === "view" || req.path.endsWith("/view");
    const disposition = isView ? "inline" : "attachment";
    const contentType = isPdf ? "application/pdf" : (file.mimeType || "application/octet-stream");

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${encodeURIComponent(file.originalName)}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`
    );
    return res.send(Buffer.from(data));
  } catch (error) {
    return res.status(500).json({ message: "Failed to download or view file" });
  }
};