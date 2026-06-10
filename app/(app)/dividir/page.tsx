import { redirect } from 'next/navigation';

const DividirRedirect = (): never => {
  redirect('/split' as never);
};

export default DividirRedirect;
