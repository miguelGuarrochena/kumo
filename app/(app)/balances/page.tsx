import { redirect } from 'next/navigation';

// Página renombrada a /compartir.
export default function BalancesRedirect(): never {
  redirect('/compartir' as never);
}
