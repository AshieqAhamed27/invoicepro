import React, {
  useState,
  useEffect,
  useRef
} from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';
import html2pdf from 'html2pdf.js/dist/html2pdf.min.js';
import QRCode from 'react-qr-code';

const formatCurrency = (
  amount,
  currency
) => {
  const symbol =
    currency === 'INR'
      ? '₹'
      : '$';

  return `${symbol}${Number(
    amount || 0
  ).toLocaleString(
    'en-IN',
    {
      minimumFractionDigits: 2
    }
  )}`;
};

const formatDate = (d) => {
  if (!d) return '—';

  return new Date(
    d
  ).toLocaleDateString(
    'en-IN',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }
  );
};

export default function InvoiceView() {
  const { id } =
    useParams();

  const user = getUser();

  const [invoice, setInvoice] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const printRef =
    useRef();

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice =
    async () => {
      try {
        const res =
          await api.get(
            `/invoices/${id}`
          );

        setInvoice(
          res.data.invoice
        );

      } catch (err) {
        console.error(
          err
        );

        alert(
          'Invoice not found'
        );
      } finally {
        setLoading(false);
      }
    };

  const markAsPaid =
    async () => {
      try {
        await api.put(
          `/invoices/${invoice._id}/status`,
          {
            status:
              'paid'
          }
        );

        alert(
          'Invoice marked as paid'
        );

        setInvoice(
          (prev) => ({
            ...prev,
            status:
              'paid'
          })
        );

      } catch {
        alert(
          'Failed to update'
        );
      }
    };

  const handleDownloadPDF =
    () => {
      const element =
        printRef.current;

      const opt = {
        margin: 8,
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        image: {
          type: 'jpeg',
          quality: 1
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor:
            '#ffffff'
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation:
            'portrait'
        }
      };

      html2pdf()
        .set(opt)
        .from(element)
        .save();
    };

  const handleWhatsAppReminder =
    () => {
      const dueDate =
        invoice.dueDate
          ? formatDate(
            invoice.dueDate
          )
          : 'soon';

      const totalAmount =
        formatCurrency(
          total,
          invoice.currency
        );

      const message = `Hi ${invoice.clientName}, this is a reminder for invoice ${invoice.invoiceNumber} of ${totalAmount}, due on ${dueDate}. Kindly complete the payment.`;

      window.open(
        `https://wa.me/?text=${encodeURIComponent(
          message
        )}`,
        '_blank'
      );
    };

  const sendSmartReminder = (
    type
  ) => {
    const dueDate =
      invoice.dueDate
        ? formatDate(
          invoice.dueDate
        )
        : 'soon';

    const totalAmount =
      formatCurrency(
        total,
        invoice.currency
      );

    let message = '';

    if (type === 'polite') {
      message = `Hi ${invoice.clientName}, hope you're doing well. Just a gentle reminder regarding invoice ${invoice.invoiceNumber} for ${totalAmount}, due on ${dueDate}. Kindly let me know once the payment is done. Thank you!`;
    }

    if (type === 'urgent') {
      message = `Hi ${invoice.clientName}, invoice ${invoice.invoiceNumber} for ${totalAmount} was due on ${dueDate}. Please make the payment at the earliest. Let me know if there are any issues.`;
    }

    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        message
      )}`,
      '_blank'
    );
  };

  const handleCopyShareLink =
    async () => {
      const link = `${window.location.origin}/public/invoice/${invoice._id}`;

      try {
        await navigator.clipboard.writeText(
          link
        );

        alert(
          'Invoice link copied!'
        );

      } catch {
        alert(
          'Failed to copy link'
        );
      }
    };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex justify-center items-center">
        Loading invoice...
      </div>
    );
  }

  if (!invoice)
    return null;

  const companyName =
    user?.companyName ||
    user?.name ||
    'InvoicePro';

  const companyLogo =
    user?.logo ||
    invoice.logo ||
    'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

  const companyAddress =
    user?.address || '';

  const items =
    invoice.items
      ?.length > 0
      ? invoice.items
      : [
        {
          name:
            invoice.serviceDescription ||
            'Service',
          price:
            invoice.amount
        }
      ];

  const subtotal =
    items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.price ||
          0
        ),
      0
    );

  const cgst =
    Number(
      invoice.cgst || 0
    );

  const sgst =
    Number(
      invoice.sgst || 0
    );

  const total =
    subtotal +
    (subtotal *
      (cgst +
        sgst)) /
    100;

  const upiLink =
    invoice.upiId &&
    `upi://pay?pa=${invoice.upiId}&pn=${encodeURIComponent(
      companyName
    )}&am=${total}&cu=INR&tn=${encodeURIComponent(
      invoice.invoiceNumber
    )}`;

  // 🔥 ONLY UI IMPROVED — LOGIC SAME

  // 🔥 ONLY UI IMPROVED VERSION

  // keep all imports same

  // inside return replace JSX with below

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <main className="container-custom py-10">

        {/* ACTION BAR */}
        <div className="flex flex-wrap gap-3 mb-6">

          {invoice.status !== 'paid' && (
            <button onClick={markAsPaid} className="btn btn-primary">
              Mark as Paid
            </button>
          )}

          <button onClick={handleCopyShareLink} className="btn btn-dark">
            Copy Link
          </button>

          <button onClick={handleWhatsAppReminder} className="btn btn-dark">
            WhatsApp
          </button>

          <button onClick={() => sendSmartReminder('polite')} className="btn btn-dark">
            Polite
          </button>

          <button onClick={() => sendSmartReminder('urgent')} className="btn btn-dark">
            Urgent
          </button>

          <button onClick={handleDownloadPDF} className="btn btn-primary">
            Download PDF
          </button>

        </div>

        {/* INVOICE CARD */}
        <div
          ref={printRef}
          className="bg-white text-black rounded-2xl p-8 max-w-3xl mx-auto"
        >

          {/* HEADER */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-bold">
                {companyName}
              </h2>
              <p className="text-sm text-gray-500">
                {companyAddress}
              </p>
            </div>

            <img
              src={companyLogo}
              alt="logo"
              className="w-14 h-14 object-contain"
            />
          </div>

          {/* CLIENT */}
          <div className="mb-8">
            <p className="text-gray-500 text-sm mb-1">
              Bill To
            </p>
            <h3 className="text-lg font-semibold">
              {invoice.clientName}
            </h3>
            <p className="text-sm text-gray-600">
              {invoice.clientEmail}
            </p>
          </div>

          {/* ITEMS TABLE STYLE */}
          <div className="mb-8 border border-gray-200 rounded-xl overflow-hidden">

            {items.map((item, i) => (
              <div
                key={i}
                className="flex justify-between p-4 border-b last:border-none"
              >
                <span>{item.name}</span>
                <span className="font-medium">
                  {formatCurrency(item.price, invoice.currency)}
                </span>
              </div>
            ))}

          </div>

          {/* TOTAL */}
          <div className="flex justify-between items-center text-xl font-semibold mb-8">
            <span>Total</span>
            <span className="text-green-600">
              {formatCurrency(total, invoice.currency)}
            </span>
          </div>

          {/* PAYMENT */}
          {invoice.upiId && (
            <div className="text-center border-t pt-6">

              <h3 className="text-lg font-semibold mb-4">
                Pay via UPI
              </h3>

              <div className="flex justify-center mb-4">
                <QRCode value={upiLink} size={150} />
              </div>

              <button
                onClick={() => (window.location.href = upiLink)}
                className="btn btn-primary"
              >
                Pay Now
              </button>

            </div>
          )}

        </div>

      </main>
    </div>
  );
}