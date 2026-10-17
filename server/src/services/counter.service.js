import { Counter } from '../models/Counter.js';

/**
 * Atomically generates the next sequential invoice number for the current local day.
 * Format: INV-YYYYMMDD-XXXX (e.g. INV-20261017-0001)
 *
 * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session for transaction
 * @returns {Promise<string>} Unique sequential invoice number
 */
export const getNextInvoiceNumber = async (session = null) => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateKey = `${year}${month}${day}`;
  const counterKey = `invoice_${dateKey}`;

  const options = {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true
  };
  if (session) {
    options.session = session;
  }

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    options
  );

  const seqNumber = String(counter.seq).padStart(4, '0');
  return `INV-${dateKey}-${seqNumber}`;
};
