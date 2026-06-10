import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const loadImageAsDataURL = async (url) => {
    if (!url) return null;
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) return null;
        const blob = await response.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.warn('Failed to load logo:', err);
        return null;
    }
};

const getImageFormat = (dataUrl) => {
    if (!dataUrl) return 'PNG';
    if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
    if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
    return 'PNG';
};

export async function generateInvoicePDF({
    clinic,
    invoiceNumber,
    receiptNumber = null,
    issueDate,
    dueDate,
    clientName,
    paymentMethod,
    paymentStatus,
    procedures = [],
    items = [],
    total,
}) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;

    const teal600 = [13, 148, 136];
    const teal700 = [15, 118, 110];
    const emerald500 = [16, 185, 129];
    const slate900 = [15, 23, 42];
    const slate700 = [51, 65, 85];
    const slate500 = [100, 116, 139];
    const slate300 = [203, 213, 225];
    const slate200 = [226, 232, 240];
    const slate100 = [241, 245, 249];

    // ---------- HEADER BANNER ----------
    const bannerHeight = 130;
    doc.setFillColor(...teal600);
    doc.rect(0, 0, pageWidth, bannerHeight, 'F');
    doc.setFillColor(...teal700);
    doc.rect(0, bannerHeight - 4, pageWidth, 4, 'F');

    const logoSize = 64;
    const logoX = margin;
    const logoY = 32;

    const logoData = await loadImageAsDataURL(clinic?.logo_url);
    if (logoData) {
        try {
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8, 12, 12, 'F');
            doc.addImage(logoData, getImageFormat(logoData), logoX, logoY, logoSize, logoSize);
        } catch (err) {
            console.warn('Could not embed logo:', err);
        }
    } else {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(logoX, logoY, logoSize, logoSize, 14, 14, 'F');
        doc.setTextColor(...teal600);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(34);
        const initial = (clinic?.name || 'P').charAt(0).toUpperCase();
        doc.text(initial, logoX + logoSize / 2, logoY + logoSize / 2 + 12, { align: 'center' });
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(clinic?.name || 'Veterinary Clinic', logoX + logoSize + 18, logoY + 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let metaY = logoY + 40;
    if (clinic?.location) {
        doc.text(clinic.location, logoX + logoSize + 18, metaY);
        metaY += 12;
    }
    if (clinic?.phone) {
        doc.text(clinic.phone, logoX + logoSize + 18, metaY);
    }

    const headerLabel = receiptNumber ? 'RECEIPT' : 'INVOICE';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.setTextColor(255, 255, 255);
    doc.text(headerLabel, pageWidth - margin, logoY + 24, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (receiptNumber) {
        doc.text(`Receipt No. ${receiptNumber}`, pageWidth - margin, logoY + 42, { align: 'right' });
        doc.text(`Invoice No. ${invoiceNumber}`, pageWidth - margin, logoY + 56, { align: 'right' });
    } else {
        doc.text(`No. ${invoiceNumber}`, pageWidth - margin, logoY + 42, { align: 'right' });
    }

    let cursorY = bannerHeight + 36;

    // ---------- META BLOCKS ----------
    const colW = (pageWidth - margin * 2) / 3;
    const drawMetaBlock = (label, value, x) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...slate500);
        doc.text(label.toUpperCase(), x, cursorY);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...slate900);
        doc.text(value || '—', x, cursorY + 16);
    };

    drawMetaBlock('Bill To', clientName || 'Walk-in Client', margin);
    drawMetaBlock('Issue Date', new Date(issueDate).toLocaleDateString(), margin + colW);
    drawMetaBlock('Due Date', dueDate ? new Date(dueDate).toLocaleDateString() : '—', margin + colW * 2);
    cursorY += 48;
    drawMetaBlock('Payment Status', paymentStatus, margin);
    drawMetaBlock('Payment Method', paymentMethod || '—', margin + colW);
    cursorY += 50;

    // ---------- LINE ITEMS ----------
    const rows = [];
    procedures.forEach(p => rows.push([p.name, 'Service', '1', `EGP ${Number(p.price).toFixed(2)}`, `EGP ${Number(p.price).toFixed(2)}`]));
    items.forEach(i => rows.push([
        i.item.item_name,
        i.item.category || 'Item',
        String(i.qty),
        `EGP ${Number(i.item.unit_price).toFixed(2)}`,
        `EGP ${(Number(i.item.unit_price) * i.qty).toFixed(2)}`
    ]));

    autoTable(doc, {
        startY: cursorY,
        head: [['Description', 'Type', 'Qty', 'Unit Price', 'Subtotal']],
        body: rows.length > 0 ? rows : [['Visit billed', '—', '—', '—', `EGP ${Number(total).toFixed(2)}`]],
        theme: 'plain',
        headStyles: {
            fillColor: slate100,
            textColor: slate700,
            fontSize: 8.5,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 11,
            lineColor: slate200,
            lineWidth: { bottom: 0.8 },
        },
        bodyStyles: {
            fontSize: 10,
            textColor: slate700,
            cellPadding: 12,
            lineColor: slate200,
            lineWidth: { bottom: 0.5 },
        },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: slate900 },
            2: { halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'right', fontStyle: 'bold', textColor: slate900 },
        },
        margin: { left: margin, right: margin },
        alternateRowStyles: { fillColor: [252, 253, 254] },
    });

    let afterTableY = doc.lastAutoTable.finalY + 24;

    // ---------- TOTALS PANEL ----------
    const panelW = 240;
    const panelX = pageWidth - margin - panelW;

    doc.setFillColor(...slate100);
    doc.roundedRect(panelX, afterTableY, panelW, 92, 10, 10, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...slate500);
    doc.text('Subtotal', panelX + 16, afterTableY + 22);
    doc.setTextColor(...slate900);
    doc.text(`EGP ${Number(total).toFixed(2)}`, panelX + panelW - 16, afterTableY + 22, { align: 'right' });

    doc.setDrawColor(...slate300);
    doc.line(panelX + 16, afterTableY + 38, panelX + panelW - 16, afterTableY + 38);

    const isPaid = paymentStatus === 'Paid';
    doc.setFillColor(...(isPaid ? emerald500 : teal600));
    doc.roundedRect(panelX + 16, afterTableY + 50, panelW - 32, 30, 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(isPaid ? 'TOTAL PAID' : 'TOTAL DUE', panelX + 26, afterTableY + 70);
    doc.setFontSize(13);
    doc.text(`EGP ${Number(total).toFixed(2)}`, panelX + panelW - 26, afterTableY + 70, { align: 'right' });

    // ---------- PAID STAMP (if applicable) ----------
    if (isPaid) {
        const stampX = margin + 10;
        const stampY = afterTableY + 28;
        doc.setDrawColor(...emerald500);
        doc.setTextColor(...emerald500);
        doc.setLineWidth(2);
        doc.roundedRect(stampX, stampY, 110, 42, 6, 6, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('PAID', stampX + 55, stampY + 23, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleDateString(), stampX + 55, stampY + 35, { align: 'center' });
        doc.setLineWidth(0.5);
    }

    // ---------- FOOTER ----------
    const footerY = pageHeight - margin - 20;
    doc.setDrawColor(...slate200);
    doc.line(margin, footerY - 16, pageWidth - margin, footerY - 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...slate500);
    doc.text('Thank you for trusting us with your pet\'s care.', margin, footerY);
    doc.text(`${clinic?.name || 'PetPals'} • Generated ${new Date().toLocaleString()}`, pageWidth - margin, footerY, { align: 'right' });

    return doc;
}

export async function previewInvoicePDF(invoiceData) {
    const doc = await generateInvoicePDF(invoiceData);
    const blobUrl = doc.output('bloburl');
    return blobUrl;
}

export async function downloadInvoicePDF(invoiceData) {
    const doc = await generateInvoicePDF(invoiceData);
    const baseName = invoiceData.receiptNumber
        ? `receipt-${invoiceData.receiptNumber}`
        : `invoice-${invoiceData.invoiceNumber}`;
    doc.save(`${baseName}.pdf`);
}
