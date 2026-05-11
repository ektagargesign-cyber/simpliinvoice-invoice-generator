// Convert a number to words using the Indian numbering system (Lakh, Crore).
const ones = ["", "One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
  "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const tens = ["", "", "Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? " " + ones[o] : "");
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let s = "";
  if (h) s += ones[h] + " Hundred";
  if (r) s += (h ? " " : "") + twoDigits(r);
  return s;
}

export function numberToIndianWords(num: number): string {
  if (!isFinite(num)) return "";
  const isNeg = num < 0;
  num = Math.abs(num);
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  const partsToWords = (n: number): string => {
    if (n === 0) return "Zero";
    let result = "";
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundred = n;

    if (crore) result += twoDigits(crore) + " Crore ";
    if (lakh) result += twoDigits(lakh) + " Lakh ";
    if (thousand) result += twoDigits(thousand) + " Thousand ";
    if (hundred) result += threeDigits(hundred);
    return result.trim();
  };

  let words = "Indian Rupees " + partsToWords(rupees);
  if (paise > 0) words += " and " + partsToWords(paise) + " Paise";
  words += " Only";
  if (isNeg) words = "Minus " + words;
  return words;
}
