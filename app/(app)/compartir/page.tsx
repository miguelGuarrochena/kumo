import { redirect } from 'next/navigation';

// Redirect legacy URLs.
const CompartirRedirect = (): never => {
  redirect('/split' as never);
};

export default CompartirRedirect;
