// utils/formatDate.ts
export function formatDate(input: string): string {
  const date = new Date(input);

  // Format the day with suffix (1st, 2nd, 3rd, etc.)
  const day = date.getDate();
  const dayWithSuffix = `${day}${getDaySuffix(day)}`;

  // Use Intl.DateTimeFormat without the comma by avoiding using a weekday with a comma
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  const formattedDate = new Intl.DateTimeFormat('en-GB', options).format(date);

  // Replace the day with the suffixed day
  return formattedDate.replace(day.toString(), dayWithSuffix).slice(0, 3) + formattedDate.replace(day.toString(), dayWithSuffix).slice(4);;
}

function getDaySuffix(day: number): string {
  if (day > 3 && day < 21) return 'th'; // Special case for 11th, 12th, 13th, etc.
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function formatDateAsMonth(input: string): string {
  const date = new Date(input);

  // Format the day with suffix (1st, 2nd, 3rd, etc.)
  const day = date.getDate();
  const dayWithSuffix = `${day}${getDaySuffix(day)}`;

  // Use Intl.DateTimeFormat without the comma by avoiding using a weekday with a comma
  const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
  const formattedDate = new Intl.DateTimeFormat('en-GB', options).format(date);

  // Replace the day with the suffixed day
  return formattedDate;
}

export function formatDateAsDDMMYYYY(input: string): string {
  const date = new Date(input);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = date.getFullYear();

  return year === 9999 ? 'forever' : `${day}/${month}/${year}`;
}