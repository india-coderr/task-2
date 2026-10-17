import { Settings } from '../models/Settings.js';
import { apiSuccess } from '../utils/response.js';

export const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        storeName: 'Greenfield Grocers',
        taxRate: 5,
        currencySymbol: '₹',
        staffMaxDiscountPercent: 10
      });
    }

    return apiSuccess(res, settings);
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    const { storeName, taxRate, currencySymbol, staffMaxDiscountPercent } = req.body;

    if (storeName !== undefined) settings.storeName = storeName.trim();
    if (taxRate !== undefined) settings.taxRate = Number(taxRate);
    if (currencySymbol !== undefined) settings.currencySymbol = currencySymbol.trim();
    if (staffMaxDiscountPercent !== undefined) settings.staffMaxDiscountPercent = Number(staffMaxDiscountPercent);

    await settings.save();

    return apiSuccess(res, settings);
  } catch (error) {
    next(error);
  }
};
