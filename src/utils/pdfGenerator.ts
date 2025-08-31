import jsPDF from 'jspdf';

export const generateInvoicePDF = (invoiceData: any) => {
  const doc = new jsPDF();
  
  // Ajouter le logo (vous devrez l'encoder en base64)
  // doc.addImage(logoBase64, 'PNG', 20, 20, 30, 30);
  
  // Ajouter le contenu de la facture
  doc.setFontSize(20);
  doc.text('Facture', 20, 60);
  
  doc.setFontSize(12);
  doc.text(`Numéro: ${invoiceData.invoiceNumber}`, 20, 80);
  doc.text(`Date: ${invoiceData.invoiceDate}`, 20, 95);
  
  // Ajouter toutes les informations fixes de la facture
  // ... (reproduire exactement le layout de la facture PDF fournie)
  
  doc.save(`facture-${invoiceData.invoiceNumber}.pdf`);
};