import { redirect } from 'next/navigation';

const RemindersRedirectPage = () => {
  redirect('/calendar?view=upcoming');
};

export default RemindersRedirectPage;
