import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function ExportActions({ targetRef }) {
  const exportPNG = async () => {
    if (!targetRef.current) return;
    try {
      const dataUrl = await toPng(targetRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = 'ppp-summary.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export failed:', err);
    }
  };

  const exportPDF = async () => {
    if (!targetRef.current) return;
    try {
      const dataUrl = await toPng(targetRef.current, { cacheBust: true });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('ppp-summary.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  return (
    <div className="flex gap-4">
      <button
        onClick={exportPNG}
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Export PNG
      </button>
      <button
        onClick={exportPDF}
        className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
      >
        Export PDF
      </button>
    </div>
  );
}
