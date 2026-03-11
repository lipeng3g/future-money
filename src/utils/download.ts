export const downloadTextFile = (fileName: string, content: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke after a tick to avoid Safari edge cases.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
};
