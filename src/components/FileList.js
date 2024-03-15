import React from 'react';
import './FileList.css'; 

const FileList = ({ files, copyFile, renameFile }) => {
  const handleCopy = (fileName) => {
    copyFile(fileName);
  };

  const handleRename = (fileName) => {
    const newFileName = prompt("Enter new file name:");
    if (newFileName) {
      renameFile(fileName, newFileName);
    }
  };

  return (
    <table className="file-list">
      <thead>
        <tr>
          <th>File Name</th>
          <th>Status</th>
          <th>Actions</th> 
        </tr>
      </thead>
      <tbody>
        {files.map((file) => (
          <tr key={file.name} className="file-item">
            <td>{file.name}</td>
            <td className={`file-status ${file.status}`}>{file.status}</td>
            <td className="file-actions">
              <button className="copy" onClick={() => handleCopy(file.name)}>Copy</button>
              <button className="rename" onClick={() => handleRename(file.name)}>Rename</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default FileList;
