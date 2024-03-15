import React, { useState, useRef } from "react";
import JSZip from "jszip";
import FileList from "./components/FileList";
import "./App.css";

function App() {
  const [zipFile, setZipFile] = useState(null);
  const [extractedFiles, setExtractedFiles] = useState([]);
  const [processingStatus, setProcessingStatus] = useState("idle");
  const [destination, setDestination] = useState("");
  const [destinationHandle, setDestinationHandle] = useState(null);
  const [startFileIndex, setStartFileIndex] = useState(0);
  const processingPausedRef = useRef(false); 

  const handleFileSelection = (event) => {
    setZipFile(event.target.files[0]);
    setExtractedFiles([]);
    setProcessingStatus("idle");
  };

  const handleSelectDestination = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      setDestinationHandle(dirHandle);
      const path = dirHandle.name;
      setDestination(path);
    } catch (error) {
      window.alert("Error selecting destination:", error);
    }
  };

  const sanitizedFileName = (fileName) => {
    return fileName.replace(/[<>:"/\\|?*]/g, "");
  };

  const handleProcess = async () => {
    if (!destination) {
      window.alert("Error: No destination selected.");
      setProcessingStatus("error");
      return;
    }

    setProcessingStatus("processing");

    const zip = new JSZip();

    try {
      const content = await zip.loadAsync(zipFile);

      const files = Object.keys(content.files).map((filename, index) => ({
        name: filename,
        status: index >= startFileIndex ? "pending" : "completed",
      }));
      setExtractedFiles(files);

      // File processing loop
      for (let i = startFileIndex; i < files.length; i++) {
        if (processingPausedRef.current) {
          setStartFileIndex(i); // Update start index for resume
          break; // Exit loop if processing is paused
        }

        files[i].status = "processing";
        setExtractedFiles([...files]);

        const zipEntry = content.files[files[i].name];
        const unzippedFileContent = await zipEntry.async("arraybuffer");

        try {
          const newFilename = sanitizedFileName(files[i].name);
          const newFileHandle = await destinationHandle.getFileHandle(
            newFilename,
            { create: true }
          );
          const writable = await newFileHandle.createWritable();
          await writable.write(unzippedFileContent);
          await writable.close();
        } catch (error) {
          window.alert("Error saving file");
          console.error("Error saving file:", error);
        }

        files[i].status = "completed";
        setExtractedFiles([...files]);

        if (i === files.length - 1) {
          setProcessingStatus("completed"); // Set status to completed only when loop finishes
        }
      }
    } catch (error) {
      window.alert("Error loading zip file");
      console.error("Error loading zip file:", error);
      setProcessingStatus("error");
    }
  };

  const handlePause = () => {
    processingPausedRef.current = true; 
    if (processingStatus !== "completed") {
      setProcessingStatus("paused"); 
    }
  };

  const handleResume = () => {
    processingPausedRef.current = false; 
    setProcessingStatus("processing");
    handleProcess(); // Resume processing
  };

  const copyFile = async (fileName) => {
    try {
      fileName = sanitizedFileName(fileName);
      // Extract the file name without extension and the file extension
      const lastIndex = fileName.lastIndexOf(".");
      const nameWithoutExtension = fileName.substring(0, lastIndex);
      const fileExtension = fileName.substring(lastIndex);

      // Construct the new file name with '_copy' suffix
      const newName = `${nameWithoutExtension}_copy${fileExtension}`;

      // Get the file handle for the original file
      const fileHandle = await destinationHandle.getFileHandle(fileName);

      // Get the file contents
      const file = await fileHandle.getFile();

      // Create a writable file handle for the new file
      const newFileHandle = await destinationHandle.getFileHandle(newName, {
        create: true,
      });
      const writable = await newFileHandle.createWritable();

      // Write the file contents to the new file
      await writable.write(file);
      await writable.close();

      window.alert(`File "${fileName}" copied successfully.`);

      // Update the extractedFiles state to include the new file
      setExtractedFiles((prevFiles) => [
        ...prevFiles,
        { name: newName, status: "completed" },
      ]);
    } catch (error) {
      window.alert(`Error copying file "${fileName}":`, error);
    }
  };

  const renameFile = async (fileName, newFileName) => {
    try {
      newFileName = sanitizedFileName(newFileName);
      // Extract file extension from fileName
      const fileExtension = fileName.split(".").pop();

      // Append the file extension to newFileName
      const newFileNameWithExtension = newFileName + "." + fileExtension;

      let name = sanitizedFileName(fileName);
      const fileHandle = await destinationHandle.getFileHandle(name);
      await fileHandle.move(destinationHandle, newFileNameWithExtension);
      console.log(
        `File "${fileName}" renamed to "${newFileNameWithExtension}" successfully.`
      );

      // Update extractedFiles state with the new file name
      const updatedFiles = extractedFiles.map((file) => {
        if (file.name === fileName) {
          return { ...file, name: newFileNameWithExtension };
        }
        return file;
      });
      setExtractedFiles(updatedFiles);
    } catch (error) {
      window.alert(
        `Error renaming file "${fileName}" to "${newFileName}":`,
        error
      );
    }
  };

  return (
    <div className="container">
      <input
        type="file"
        accept=".zip"
        onChange={(event) => handleFileSelection(event)}
        className="input-file"
      />
      {destination && <p className="destination">Destination: {destination}</p>}
      <div className="btn-container">
        <button onClick={handleSelectDestination} className="button-group">
          Select Destination
        </button>
        <button
          onClick={!processingPausedRef.current ? handleProcess : null}
          disabled={
            processingStatus === "processing" ||
            processingStatus === "completed"
          }
          className="button-group"
        >
          Start
        </button>
        <button
          onClick={handlePause}
          disabled={processingStatus !== "processing"}
          className="button-group"
        >
          Pause
        </button>
        <button
          disabled={processingStatus !== "paused"}
          onClick={processingPausedRef.current ? handleResume : null}
          className="button-group"
        >
          Resume
        </button>
      </div>
      {extractedFiles.length > 0 && (
        <FileList
          files={extractedFiles}
          copyFile={copyFile}
          renameFile={renameFile}
        />
      )}
    </div>
  );
}

export default App;
