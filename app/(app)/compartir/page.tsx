import { redirect } from 'next/navigation';

// Ruta renombrada a /dividir; mantenemos este redirect para no romper
// bookmarks ni links viejos compartidos por WhatsApp.
export default function CompartirRedirect(): never {
  redirect('/dividir' as never);
}
