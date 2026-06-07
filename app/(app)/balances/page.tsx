import { redirect } from 'next/navigation';

// Página renombrada a /dividir.
export default function BalancesRedirect(): never {
  redirect('/dividir' as never);
}
