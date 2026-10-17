/**
 * Date utility helpers for local date-time conversions and ranges.
 * Ensures from is 00:00:00.000 and to is 23:59:59.999 in server local time.
 */

export const getTodayLocalString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalDateRange = (fromString, toString) => {
  const todayStr = getTodayLocalString();
  const startStr = fromString || todayStr;
  const endStr = toString || fromString || todayStr;

  const [sYear, sMonth, sDay] = startStr.split('-').map(Number);
  const startDate = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);

  const [eYear, eMonth, eDay] = endStr.split('-').map(Number);
  const endDate = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);

  return {
    startDate,
    endDate,
    startStr,
    endStr
  };
};
