import * as pdfjsLib from 'pdfjs-dist';

// Set worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export async function extractTextFromPDF(file: File): Promise<{
  text: string[];
  pageCount: number;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item: any) => item.str || '')
      .join(' ');
    pages.push(text);
  }

  return {
    text: pages,
    pageCount: pdf.numPages,
  };
}

export function chunkText(pages: string[], chunkSize: number = 500, overlap: number = 50): {
  chunks: string[];
  pageMap: number[];
} {
  const chunks: string[] = [];
  const pageMap: number[] = [];

  pages.forEach((pageText, pageIndex) => {
    const words = pageText.split(/\s+/);

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words
        .slice(i, i + chunkSize)
        .join(' ')
        .trim();

      if (chunk.length > 50) {
        chunks.push(chunk);
        pageMap.push(pageIndex + 1);
      }
    }
  });

  return { chunks, pageMap };
}
