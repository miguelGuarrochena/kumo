import { redirect } from 'next/navigation';

const BalancesRedirect = (): never => {
  redirect('/expenses?section=saldos' as never);
};

export default BalancesRedirect;
