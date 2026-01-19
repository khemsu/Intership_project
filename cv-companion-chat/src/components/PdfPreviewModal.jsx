// components/PdfPreviewModal.jsx
import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { Document, Page } from "react-pdf";

Modal.setAppElement("#root"); // Replace "#root" with your app root ID

const PdfPreviewModal = ({ filename, isOpen, onClose }) => {
  const [url, setUrl] = useState("");
  const [numPages, setNumPages] = useState(null);

  useEffect(() => {
    if (!filename) {
      setUrl("");
      return;
    }

    async function fetchSignedUrl() {
      try {
        const res = await fetch(`/api/get-signed-url/${encodeURIComponent(filename)}`);
        if (!res.ok) throw new Error("Failed to get signed URL");
        const data = await res.json();
        setUrl(data.url);
      } catch (err) {
        console.error(err);
        setUrl("");
      }
    }
    fetchSignedUrl();
  }, [filename]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="PDF Preview"
      style={{
        content: {
          top: "50%",
          left: "50%",
          right: "auto",
          bottom: "auto",
          marginRight: "-50%",
          transform: "translate(-50%, -50%)",
          width: "80%",
          height: "80%",
          padding: "1rem",
          overflow: "auto",
        },
      }}
    >
      <button onClick={onClose} style={{ float: "right", fontSize: "1.5rem" }}>
        &times;
      </button>
      <h2>Preview: {filename}</h2>
      {!url && <p>Loading PDF...</p>}
      {url && (
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading="Loading PDF..."
          options={{ workerSrc: "/pdf.worker.js" }} // adjust if needed
        >
          {Array.from(new Array(numPages), (el, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              width={600}
            />
          ))}
        </Document>
      )}
    </Modal>
  );
};

export default PdfPreviewModal;
