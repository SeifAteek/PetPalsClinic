import React, { useEffect, useState } from 'react';
import { X, Download, Printer, Loader2 } from 'lucide-react';
import { previewInvoicePDF, downloadInvoicePDF } from '../utils/invoicePdf';

const InvoicePreviewModal = ({ invoiceData, onClose }) => {
    const [pdfUrl, setPdfUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        let currentUrl = null;

        const generate = async () => {
            try {
                const url = await previewInvoicePDF(invoiceData);
                if (cancelled) return;
                currentUrl = url;
                setPdfUrl(url);
            } catch (err) {
                console.error('Failed to render invoice preview:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        generate();

        return () => {
            cancelled = true;
            if (currentUrl) URL.revokeObjectURL(currentUrl);
        };
    }, [invoiceData]);

    const handleDownload = async () => {
        try {
            await downloadInvoicePDF(invoiceData);
        } catch (err) {
            console.error('Failed to download invoice:', err);
        }
    };

    const handlePrint = () => {
        if (!pdfUrl) return;
        const iframe = document.getElementById('invoice-pdf-frame');
        if (iframe?.contentWindow) {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                window.open(pdfUrl, '_blank');
            }
        } else {
            window.open(pdfUrl, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white/5 rounded-2xl shadow-xl w-full max-w-3xl h-[90vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 shrink-0">
                    <div>
                        <h3 className="font-bold text-white text-lg">
                            {invoiceData.receiptNumber ? 'Receipt Generated' : 'Invoice Preview'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {invoiceData.receiptNumber
                                ? <>Receipt #{invoiceData.receiptNumber} · saved to database</>
                                : <>Invoice #{invoiceData.invoiceNumber}</>}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 clinic-card border-white/10 hover:bg-white/10 text-slate-200 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                        >
                            <Printer className="w-4 h-4" />
                            Print
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            Download PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:bg-white/5/10 hover:text-slate-200 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 bg-white/5/10 overflow-hidden">
                    {isLoading ? (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-400 mb-3" />
                            <p className="text-sm font-medium text-slate-500">Generating invoice...</p>
                        </div>
                    ) : pdfUrl ? (
                        <iframe
                            id="invoice-pdf-frame"
                            src={pdfUrl}
                            title="Invoice PDF"
                            className="w-full h-full border-0"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                            Failed to render invoice. Try downloading instead.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvoicePreviewModal;
