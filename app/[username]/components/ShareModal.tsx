"use client";

import React, { useState, useEffect } from "react";
import { CaretRight, DotsThreeCircle } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";

interface ShareModalProps {
  username: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ username }) => {
  // State to control the modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State to track if the link was copied
  const [isCopied, setIsCopied] = useState(false);

  // Function to open the modal
  const openModal = () => {
    setIsModalOpen(true);
  };

  // Function to close the modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Close the modal when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const modalContent = document.querySelector(".modal-content");
      if (modalContent && !modalContent.contains(event.target as Node)) {
        closeModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isModalOpen]);

  // Function to copy the link
  const copyLinkToClipboard = () => {
    const link = `https://dental.bio/${username}`;
    navigator.clipboard.writeText(link).then(
      () => {
        setIsCopied(true); // Show "Copied!" message
        setTimeout(() => {
          setIsCopied(false); // Hide it after 2 seconds
        }, 2000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
      }
    );
  };

  return (
    <>
      {/* Three dots icon */}
      <button
        type="button"
        className="border-0 bg-transparent p-0"
        onClick={openModal}
      >
        <DotsThreeCircle
          weight="fill"
          fill="#BFBFBF"
          size={40}
          className="header-modal-icon md:mt-1"
        />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1050,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="modal custom-modal-dialog fade show"
            style={{
              display: "block",
              paddingLeft: 0,
            }}
            aria-modal="true"
            role="dialog"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                {/* Modal header (Desktop - md and above) */}
                <div className="py-4 px-6 mx-6 flex justify-center items-center">
                  <h5 className="text-center font-medium flex-1">
                    @{username}
                  </h5>
                  <button
                    type="button"
                    className="btn-close text-xs"
                    onClick={closeModal}
                  ></button>
                </div>
                {/* Modal body */}
                <div className="modal-body p-0">
                  <div className="p-3 mobile-modal-body">
                    {/* Copy Link */}
                    <div className="sharelinks pb-1">
                      <button
                        onClick={copyLinkToClipboard}
                        className="text-decoration-none w-100 border-0 bg-transparent p-0"
                        style={{ cursor: "pointer" }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Image
                              src="/assets/copy.png"
                              alt="copy"
                              width={24}
                              height={24}
                              className="img-fluid modal-icons"
                            />
                            <h6 className="fw-semibold mb-0 text-black">
                              {isCopied ? "Copied!" : "Copy dentalbio"}
                            </h6>
                          </div>
                          <CaretRight size={24} className="text-black" />
                        </div>
                      </button>
                    </div>
                    {/* LinkedIn */}
                    <div className="sharelinks">
                      <a
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=https://dental.bio/${username}`}
                        className="text-decoration-none"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex align-items-center gap-3">
                            <Image
                              src="/assets/share.png"
                              alt="linkedin"
                              width={24}
                              height={24}
                              className="img-fluid modal-icons"
                            />
                            <h6 className="fw-semibold mb-0 text-black">
                              Share on LinkedIn
                            </h6>
                          </div>
                          <CaretRight size={24} className="text-black" />
                        </div>
                      </a>
                    </div>
                    {/* Instagram */}
                    <div className="sharelinks">
                      <a
                        href="#"
                        className="text-decoration-none"
                        onClick={(e) => e.preventDefault()}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex align-items-center gap-3">
                            <Image
                              src="/assets/instagram.png"
                              alt="instagram"
                              width={24}
                              height={24}
                              className="img-fluid modal-icons"
                            />
                            <h6 className="fw-semibold mb-0 text-black">
                              Share on Instagram
                            </h6>
                          </div>
                          <CaretRight size={24} className="text-black" />
                        </div>
                      </a>
                    </div>
                    {/* Facebook */}
                    <div className="sharelinks">
                      <a
                        href={`https://www.facebook.com/sharer/sharer.php?u=https://dental.bio/${username}`}
                        className="text-decoration-none"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <Image
                              src="/assets/facebook.png"
                              alt="facebook"
                              width={24}
                              height={24}
                              className="img-fluid modal-icons"
                            />
                            <h6 className="fw-semibold mb-0 text-black">
                              Share on Facebook
                            </h6>
                          </div>
                          <CaretRight size={24} className="text-black" />
                        </div>
                      </a>
                    </div>
                    {/* WhatsApp */}
                    <div className="sharelinks">
                      <a
                        href={`https://api.whatsapp.com/send?text=https://dental.bio/${username}`}
                        className="text-decoration-none"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <Image
                              src="/assets/whatsapp.png"
                              alt="whatsapp"
                              width={24}
                              height={24}
                              className="img-fluid modal-icons"
                            />
                            <h6 className="fw-semibold mb-0 text-black">
                              Share via Whatsapp
                            </h6>
                          </div>
                          <CaretRight size={24} className="text-black" />
                        </div>
                      </a>
                    </div>
                    {/* Messenger */}
                    <div className="sharelinks">
                      <a
                        href={`fb-messenger://share?link=https://dental.bio/${username}`}
                        className="text-decoration-none"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <Image
                              src="/assets/messanger.png"
                              alt="messenger"
                              width={24}
                              height={24}
                              className="img-fluid modal-icons"
                            />
                            <h6 className="fw-semibold mb-0 text-black">
                              Share via Messenger
                            </h6>
                          </div>
                          <CaretRight size={24} className="text-black" />
                        </div>
                      </a>
                    </div>
                    {/* Email */}
                    <div className="sharelinks">
                      <a
                        href={`mailto:?subject=Check%20out%20this%20Dentalbio&body=Visit%20https://dental.bio/${username}`}
                        className="text-decoration-none"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <Image
                              src="/assets/email.png"
                              alt="email"
                              width={24}
                              height={24}
                              className="img-fluid modal-icons"
                            />
                            <h6 className="fw-semibold mb-0 text-black">
                              Share via Email
                            </h6>
                          </div>
                          <CaretRight size={24} className="text-black" />
                        </div>
                      </a>
                    </div>

                    <div>
                      <button className="text-center flex justify-between items-center modal-copy-content w-full">
                        <div
                          onClick={copyLinkToClipboard}
                          className="flex justify-between items-center w-full"
                          style={{ cursor: "pointer" }}
                        >
                          <h6 className=" mb-0">
                            {isCopied ? "Copied!" : `dental.bio/${username}`}
                          </h6>
                          <Image
                            src="/assets/copy-icon.png"
                            alt="copy"
                            width={24}
                            height={24}
                            className="img-fluid"
                          />
                        </div>
                      </button>
                    </div>
                  </div>
                  {/* Report Dentalbio */}
                  <div className="report-dentalbio">
                    <div className="flex items-center justify-between gap-2">
                      <h6 className=" mb-0">Report this Dentalbio</h6>
                      <CaretRight size={24} className="text-black" />
                    </div>
                  </div>
                  {/* Modal footer */}
                  <div className="modal-footer justify-center flex-col modal-footer-content mb-6">
                    <h5>Create your own Dentalbio</h5>
                    <div className="flex items-center justify-center gap-3">
                      <Link href={"/"} target="_blank">
                        <button className="custom-fill-btn">Sign up</button>
                      </Link>
                      <Link href={"/"} target="_blank">
                        <button className="custom-outline-btn btn-learn-more mt-0">
                          Learn more
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareModal;
