import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Button from '../ui/Button.jsx';

export function ExportActions({ targetRef }) {
  const exportPNG = async () => {
    if (!targetRef.current) return;
    const canvas = await html2canvas(targetRef.current, { scale: 2, backgroundColor: '#FAF9F6' });
    const link = document.createElement('a');
    link.download = 'ppp-summary.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const exportPDF = async () => {
    if (!targetRef.current) return;
    const canvas = await html2canvas(targetRef.current, { scale: 2, backgroundColor: '#FAF9F6' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('ppp-summary.pdf');
  };

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
      <Button onClick={exportPNG}>Export PNG</Button>
      <Button variant="secondary" onClick={exportPDF}>
        Export PDF
      </Button>
    </div>
  );
}

export default ExportActions;
