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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* ACTIONS */}
        <div className="flex flex-wrap justify-end gap-3 mb-6">

          {invoice.status !==
            'paid' && (
              <button
                onClick={
                  markAsPaid
                }
                className="bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-xl font-semibold"
              >
                Mark as Paid
              </button>
            )}

          <button
            onClick={
              handleCopyShareLink
            }
            className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Copy Share Link
          </button>

          <button
            onClick={
              handleWhatsAppReminder
            }
            className="bg-green-700 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            WhatsApp Reminder
          </button>

          <button
            onClick={() =>
              sendSmartReminder(
                'polite'
              )
            }
            className="bg-purple-500 hover:bg-purple-400 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Polite Reminder
          </button>

          <button
            onClick={() =>
              sendSmartReminder(
                'urgent'
              )
            }
            className="bg-red-500 hover:bg-red-400 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Urgent Reminder
          </button>

          <button
            onClick={
              handleDownloadPDF
            }
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-xl font-semibold"
          >
            Download PDF
          </button>

        </div>

        {/* INVOICE */}
        <div
          ref={printRef}
          className="bg-white text-black rounded-2xl shadow-2xl p-8 md:p-12"
        >

          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-gray-200 pb-8 mb-8">

            <div>
              <div className="flex items-center gap-3 mb-4">

                <img
                  src={
                    companyLogo
                  }
                  alt="logo"
                  className="w-14 h-14 object-contain"
                />

                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {
                      companyName
                    }
                  </h1>

                  <p className="text-sm text-gray-500">
                    Professional Invoice
                  </p>
                </div>

              </div>

              <p className="text-sm text-gray-500">
                Generated with InvoicePro
              </p>

              {companyAddress && (
                <p className="text-sm text-gray-500 mt-2 max-w-sm">
                  {
                    companyAddress
                  }
                </p>
              )}

            </div>

            <div className="text-left md:text-right">

              <p className="text-sm text-gray-500 mb-1">
                Invoice Number
              </p>

              <p className="text-2xl font-bold text-gray-900 mb-4">
                {
                  invoice.invoiceNumber
                }
              </p>

              <p className="text-sm text-gray-500">
                Date:{' '}
                {formatDate(
                  invoice.date
                )}
              </p>

              {invoice.dueDate && (
                <p className="text-sm text-gray-500">
                  Due:{' '}
                  {formatDate(
                    invoice.dueDate
                  )}
                </p>
              )}

            </div>

          </div>

          {/* BILL TO */}
          <div className="mb-10">
            <p className="text-sm uppercase tracking-wide text-gray-400 mb-2">
              Bill To
            </p>

            <h2 className="text-xl font-semibold text-gray-900">
              {
                invoice.clientName
              }
            </h2>

            <p className="text-gray-600">
              {
                invoice.clientEmail
              }
            </p>

            {invoice.gst && (
              <p className="text-sm text-gray-500 mt-2">
                GST:{' '}
                {
                  invoice.gst
                }
              </p>
            )}

          </div>

          {/* ITEMS */}
          <div className="overflow-hidden border border-gray-200 rounded-2xl mb-10">

            <div className="grid grid-cols-2 bg-gray-100 px-6 py-4 font-semibold text-gray-700">
              <span>
                Description
              </span>

              <span className="text-right">
                Amount
              </span>
            </div>

            {items.map(
              (
                item,
                index
              ) => (
                <div
                  key={
                    index
                  }
                  className="grid grid-cols-2 px-6 py-4 border-t border-gray-100"
                >
                  <p className="font-medium text-gray-800">
                    {
                      item.name
                    }
                  </p>

                  <p className="text-right font-semibold">
                    {formatCurrency(
                      item.price,
                      invoice.currency
                    )}
                  </p>
                </div>
              )
            )}

          </div>

          {/* TOTALS */}
          <div className="flex justify-end mb-10">

            <div className="w-full max-w-sm space-y-3">

              <div className="flex justify-between text-gray-600">
                <span>
                  Subtotal
                </span>

                <span>
                  {formatCurrency(
                    subtotal,
                    invoice.currency
                  )}
                </span>
              </div>

              {cgst > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>
                    CGST (
                    {cgst}
                    %)
                  </span>

                  <span>
                    {formatCurrency(
                      (subtotal *
                        cgst) /
                      100,
                      invoice.currency
                    )}
                  </span>
                </div>
              )}

              {sgst > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>
                    SGST (
                    {sgst}
                    %)
                  </span>

                  <span>
                    {formatCurrency(
                      (subtotal *
                        sgst) /
                      100,
                      invoice.currency
                    )}
                  </span>
                </div>
              )}

              <div className="border-t pt-4 flex justify-between text-2xl font-bold">
                <span>
                  Total
                </span>

                <span className="text-green-600">
                  {formatCurrency(
                    total,
                    invoice.currency
                  )}
                </span>
              </div>

            </div>

          </div>

          {/* UPI QR */}
          {invoice.upiId && (
            <div className="mb-10 text-center">

              <h3 className="text-lg font-semibold mb-4">
                Pay via UPI
              </h3>

              <div className="flex justify-center">
                <QRCode
                  value={
                    upiLink
                  }
                  size={180}
                />
              </div>

              <p className="text-sm text-gray-500 mt-3">
                Scan to pay instantly
              </p>

            </div>
          )}

          {/* NOTES */}
          {invoice.notes && (
            <div className="border-t border-gray-200 pt-6">

              <p className="text-sm uppercase text-gray-400 mb-2">
                Notes
              </p>

              <p className="text-gray-700 leading-relaxed">
                {
                  invoice.notes
                }
              </p>

            </div>
          )}

          {/* FOOTER */}
          <div className="mt-12 pt-6 border-t border-gray-200 text-center">

            <p className="text-gray-400 text-sm">
              Thank you for your business 🙏
            </p>

          </div>

        </div>

      </main>
    </div>
  );
}