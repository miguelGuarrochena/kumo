import { redirect } from 'next/navigation';

// Página renombrada a /dividir.
const BalancesRedirect = (): never => {
  redirect('/dividir' as never);
};

export default BalancesRedirect;
