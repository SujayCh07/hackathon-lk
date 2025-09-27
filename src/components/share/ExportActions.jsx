import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function ExportActions({ targetRef }) {
  const createImageDataUrl = async () => {
    if (!targetRef?.current) return null;
    const canvas = await html2canvas(targetRef.current, {
      useCORS: true,
      scale: window.devicePixelRatio || 2,
      logging: false,
      backgroundColor: '#ffffff',
    });
    return canvas.toDataURL('image/png');
  };

  const exportPNG = async () => {
    try {
      const dataUrl = await createImageDataUrl();
      if (!dataUrl) return;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'ppp-summary.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('PNG export failed:', err);
    }
  };

  const exportPDF = async () => {
    try {
      const dataUrl = await createImageDataUrl();
      if (!dataUrl) return;
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
        type="button"
        onClick={exportPNG}
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Export PNG
      </button>
      <button
        type="button"
        onClick={exportPDF}
        className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
      >
        Export PDF
      </button>
    </div>
  );
}
