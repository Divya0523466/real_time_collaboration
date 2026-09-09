import File from "../models/File.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const result = await uploadOnCloudinary(req.file.path);

    if (!result) {
      return res.status(500).json({ message: "Failed to upload file to Cloudinary. Please check your credentials." });
    }

    const savedFile = await File.create({
      originalName: req.file.originalname,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type || "auto",
      format: result.format || "",
      size: result.bytes || req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.userId,
    });

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      file: savedFile,
    });
  } catch (error) {
    console.error("Upload controller error:", error.message);
    return res.status(500).json({
      message: error.message || "Failed to upload file. Please try again later.",
    });
  }
};

export const getUserFiles = async (req, res) => {
  try {
    const files = await File.find({ uploadedBy: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, files });
  } catch (error) {
    console.error("Get user files error:", error);
    return res.status(500).json({ message: "Failed to fetch files" });
  }
};

export const getFileById = async (req, res) => {
  try {
    const file = await File.findById(req.params.id).lean();
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    return res.status(200).json({ success: true, file });
  } catch (error) {
    console.error("Get file error:", error);
    return res.status(500).json({ message: "Failed to fetch file details" });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (file.uploadedBy.toString() !== req.userId) {
      return res.status(403).json({ message: "You do not have permission to delete this file" });
    }

    await deleteFromCloudinary(file.publicId, file.resourceType);
    await File.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete file error:", error);
    return res.status(500).json({ message: "Failed to delete file" });
  }
};