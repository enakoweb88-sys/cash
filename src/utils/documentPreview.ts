// Storage can return PDFs with a generic MIME type. Identify their bytes before
// passing them to the browser's native PDF viewer.
export async function prepareDocumentPreview(blob: Blob): Promise<Blob> {
  const header = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  const isPdf = String.fromCharCode(...header) === '%PDF-';
  const type = blob.type.split(';')[0].trim().toLowerCase();
  if (isPdf) return new Blob([blob], { type: 'application/pdf' });
  if (type === 'application/pdf') {
    throw new Error('This PDF is damaged or is not a valid PDF file. Please request a new upload.');
  }
  return type === blob.type ? blob : new Blob([blob], { type });
}
