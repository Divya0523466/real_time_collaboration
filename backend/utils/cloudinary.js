import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (localFilePath, options = {}) => {
  try {
    if (!localFilePath) return null;

    const originalName = options.originalName || path.basename(localFilePath);
    const mimeType = (options.mimeType || "").toLowerCase();
    const ext = path.extname(originalName).replace(".", "").toLowerCase();

    const isImage =
      ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) ||
      mimeType.startsWith("image/");
    const isPdf = ext === "pdf" || mimeType === "application/pdf";

    let resourceType = "raw";
    if (isImage || isPdf) {
      resourceType = "image";
    }

    const nameWithoutExt = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const uploadOptions = {
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      filename_override: nameWithoutExt,
    };

    const response = await cloudinary.uploader.upload(localFilePath, uploadOptions);

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    let previewUrl = "";
    if (isPdf) {
      previewUrl = cloudinary.url(response.public_id, {
        resource_type: "image",
        format: "jpg",
        page: 1,
        secure: true,
      });
    } else if (isImage) {
      previewUrl = cloudinary.url(response.public_id, {
        resource_type: "image",
        quality: "auto",
        fetch_format: "auto",
        secure: true,
      });
    }

    return {
      ...response,
      originalName,
      resourceType,
      extension: ext,
      previewUrl,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    if (fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
      } catch {}
    }
    return null;
  }
};

export const generateCloudinaryDownloadUrl = (publicId, resourceType = "raw", format = "") => {
  try {
    const cleanPublicId = format && publicId.endsWith(`.${format}`)
      ? publicId.slice(0, -(format.length + 1))
      : publicId;
    return cloudinary.utils.private_download_url(cleanPublicId, format, {
      resource_type: resourceType,
      type: "upload",
    });
  } catch {
    return null;
  }
};

export const generateCloudinarySignedUrl = (publicId, resourceType = "image", format = "pdf") => {
  try {
    const cleanPublicId = format && publicId.endsWith(`.${format}`)
      ? publicId.slice(0, -(format.length + 1))
      : publicId;
    return cloudinary.url(cleanPublicId, {
      resource_type: resourceType,
      format: format,
      sign_url: true,
      secure: true,
    });
  } catch {
    return null;
  }
};



export default cloudinary;
