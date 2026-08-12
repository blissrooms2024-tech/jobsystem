const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function threeDigits(n: number): string {
  let s = "";
  if (n >= 100) {
    s += `${ONES[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }
  if (n >= 20) {
    s += `${TENS[Math.floor(n / 10)]} `;
    n %= 10;
  }
  if (n > 0) s += `${ONES[n]} `;
  return s;
}

/** "Ringgit One Thousand Two Hundred and Fifty and Fifty Sen Only" style, matching the legacy payslip. */
export function amountInWords(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  let whole = Math.floor(rounded);
  let sen = Math.round((rounded - whole) * 100);
  if (sen >= 100) {
    whole++;
    sen = 0;
  }

  let words = "";
  let remaining = whole;
  const million = Math.floor(remaining / 1000000);
  if (million > 0) {
    words += `${threeDigits(million)}Million `;
    remaining %= 1000000;
  }
  const thousand = Math.floor(remaining / 1000);
  if (thousand > 0) {
    words += `${threeDigits(thousand)}Thousand `;
    remaining %= 1000;
  }
  if (remaining > 0) words += threeDigits(remaining);
  words = words.replace(/\s+/g, " ").trim() || "Zero";

  let out = `Ringgit ${words}`;
  if (sen > 0) out += ` and ${threeDigits(sen).trim()} Sen`;
  return `${out} Only`;
}
