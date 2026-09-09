import { useState, useRef } from "react";
import PropTypes from "prop-types";
import { uploadFile } from "../../services/uploadService";

const FileUpload = ({
  onUploadSuccess,
  onUploadError,
  buttonClassName,
  iconClassName,
  disabled = false,
  title = "Upload file",
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setIsUploading(true);

    try {
      const data = await uploadFile(file);
      if (onUploadSuccess) {
        onUploadSuccess(data.file);
      }
      // Reset input after success
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      if (onUploadError) {
        onUploadError(error.message);
      }
      // Clear file on failure so they can try again
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="relative inline-block">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
        // Basic filter for file picker dialog
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        title={title}
        className={
          buttonClassName ||
          "flex items-center justify-center h-8 w-8 rounded-md text-[#52656A] hover:text-[#395B64] hover:bg-[#E7F6F2] transition-colors disabled:opacity-50"
        }
      >
        {isUploading ? (
          <i className="fa-solid fa-spinner fa-spin text-sm" />
        ) : (
          <i className={`fa-solid fa-paperclip ${iconClassName || "text-sm"}`} />
        )}
      </button>
    </div>
  );
};

FileUpload.propTypes = {
  onUploadSuccess: PropTypes.func,
  onUploadError: PropTypes.func,
  buttonClassName: PropTypes.string,
  iconClassName: PropTypes.string,
  disabled: PropTypes.bool,
  title: PropTypes.string,
};

export default FileUpload;
