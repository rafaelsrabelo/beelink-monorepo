/*
  What an invite must carry since the user's review of 12/11/2026: a phone and a CPF. Each call
  hands a pair no other call in the run has — a CPF is unique in a shop among the affiliates not
  ended — and a phone in area code 21, which no customer the suites register uses, so an affiliate
  is never taken for a buyer unless a test says so.
*/

let next = 100_000_000;

/** Eleven digits that are a CPF: nine from the counter, then the two check digits. */
function cpfOf(nine: string): string {
  const check = (digits: string) => {
    let sum = 0;
    for (let index = 0; index < digits.length; index += 1) sum += Number(digits[index]) * (digits.length + 1 - index);
    return ((sum * 10) % 11) % 10;
  };
  const ten = `${nine}${check(nine)}`;
  return `${ten}${check(ten)}`;
}

export function affiliateIdentity(): { phone: string; cpf: string } {
  next += 1;
  const nine = String(next).padStart(9, '0');
  return { phone: `(21) 9${nine.slice(1, 5)}-${nine.slice(5)}`, cpf: cpfOf(nine) };
}
