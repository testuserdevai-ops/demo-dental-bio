'use client';

import { useState } from 'react';

const Modal = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);
    }
  };

  const clearImage = () => {
    setUploadedImage(null);
  };

  return (
    <div className="modal fade" id="exampleModal" tabIndex={-1} aria-labelledby="exampleModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header border-0">
            <h1 className="modal-title fs-6 text-center w-100" id="exampleModalLabel">
              Add Thumbnail
            </h1>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body pt-0">
            <div className="upload-image">
              {uploadedImage ? (
                <img src={uploadedImage} className="upload-img" alt="Uploaded" />
              ) : (
                <img src="/gallery1.webp" className="upload-img" alt="Gallery" />
              )}

              <div className="custom-inputfile">
                <label htmlFor="file-upload" className="custom-file-upload">
                  Select File To Upload
                </label>
                <input id="file-upload" type="file" className="fileUploaded" onChange={handleFileChange} />
              </div>
            </div>
          </div>
          <div className="modal-footer justify-center border-0">
            <button type="button" className="btn clear-btn" data-bs-dismiss="modal" onClick={clearImage}>
              Clear
            </button>
            <button type="button" className="btn upload-btn">Upload</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
