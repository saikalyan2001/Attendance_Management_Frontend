export const exportToCSV = (data, filename) => {
  const headers = Object.keys(data[0] || {});
  const csvRows = [headers.join(',')];
  data.forEach((row) => {
    const values = headers.map((header) => `"${row[header] || ''}"`);
    csvRows.push(values.join(','));
  });
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};