import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Reglas de uso de Kumo.',
};

const UPDATED = '6 de junio de 2026';

const TermsPage = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Términos y condiciones</h1>
      <p className="text-xs text-slate-500 dark:text-slate-500 mb-6">Actualizados el {UPDATED}</p>

      <p>
        Al usar Kumo aceptás estos términos. Si no estás de acuerdo, no uses la aplicación. Dudas:{' '}
        <a href="mailto:info@kumo-app.com">info@kumo-app.com</a>.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">1. Qué es Kumo</h2>
      <p>
        Kumo es una aplicación web para gestión de finanzas personales: gastos, vencimientos, recordatorios,
        notificaciones por WhatsApp y push, y OCR de tickets. Es de uso personal y <strong>no constituye asesoramiento
        financiero, contable ni legal</strong>.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">2. Cuenta</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Necesitás una cuenta con email válido (login por Magic Link o Google).</li>
        <li>Sos responsable de mantener la seguridad de tu acceso.</li>
        <li>No podés compartir tu cuenta con terceros (los espacios compartidos son la forma oficial de compartir).</li>
        <li>
          Podés <strong>eliminar tu cuenta en cualquier momento</strong> desde Configuración → Eliminar cuenta. La
          eliminación es inmediata e irreversible.
        </li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-3">3. Uso aceptable</h2>
      <p>Al usar Kumo te comprometés a:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>No subir contenido ilegal, ofensivo, fraudulento o que viole derechos de terceros.</li>
        <li>No intentar acceder a datos de otros usuarios.</li>
        <li>No usar Kumo para enviar spam por WhatsApp ni para fines comerciales no autorizados.</li>
        <li>No realizar ingeniería inversa, scraping masivo ni abusos del servicio.</li>
        <li>
          Cargar únicamente números de WhatsApp de personas que te dieron consentimiento explícito para recibir
          notificaciones tuyas.
        </li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-3">4. Uso gratuito y complemento OCR</h2>
      <p>
        <strong>Kumo es gratuito</strong> para gastos, recordatorios, lista de compras, notificaciones por WhatsApp y push,
        y espacios compartidos (los que necesites).
      </p>
      <p className="mt-3">
        El <strong>escaneo de tickets con IA</strong> (OCR) es un complemento de pago porque utiliza servicios de terceros
        con costo por imagen. El precio se muestra al intentar usar esa función y en Configuración → Escanear tickets.
      </p>
      <p className="mt-3">
        No hay suscripción obligatoria al registrarte. Si no activás el complemento OCR, podés usar Kumo con normalidad
        cargando gastos a mano.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">5. Pagos, cancelación y reembolso</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Los pagos se procesan a través de <strong>MercadoPago</strong>. Nosotros no almacenamos los datos de tu
          tarjeta.
        </li>
        <li>
          El <strong>complemento OCR</strong> se renueva automáticamente al final de cada período (mensual o anual)
          hasta que lo canceles.
        </li>
        <li>
          Podés <strong>cancelar en cualquier momento</strong> desde Configuración → Plan → Cancelar suscripción.
          Mantenés acceso al escaneo hasta el final del período ya pagado.
        </li>
        <li>
          <strong>No hacemos reembolsos por períodos parciales</strong>. Si cancelás a la mitad del mes, mantenés el
          complemento OCR hasta el final del mes y no se renueva.
        </li>
        <li>
          Si tenés un problema con un cobro, escribinos a <a href="mailto:info@kumo-app.com">info@kumo-app.com</a> y
          revisamos caso por caso.
        </li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-3">6. Servicios de terceros</h2>
      <p>
        Kumo usa Supabase (DB y auth), Vercel (hosting), Google Gemini (OCR), Meta (WhatsApp Business), MercadoPago
        (pagos), Resend (email), PostHog y Sentry (analytics y errores). Su disponibilidad y términos pueden afectar
        la aplicación. No nos hacemos responsables de fallas en servicios de terceros.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">7. Disponibilidad</h2>
      <p>
        Hacemos lo posible para que la app esté siempre online, pero no garantizamos un uptime del 100%. Podemos
        hacer mantenimiento programado o tener cortes imprevistos.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">8. Limitación de responsabilidad</h2>
      <p>
        Kumo se ofrece &ldquo;tal cual&rdquo;. En la máxima medida permitida por la ley, no nos hacemos responsables
        de pérdidas indirectas, lucro cesante, ni daños derivados del uso o imposibilidad de uso de la app.
      </p>
      <p>
        Si un recordatorio o notificación falla (WhatsApp, push, red), seguís siendo el único responsable por
        gestionar tus pagos y compromisos. Kumo es una herramienta de ayuda, no un reemplazo de tu propio control
        financiero.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">9. Datos al cancelar o eliminar</h2>
      <p>
        Al cancelar el complemento OCR mantenés tus datos y seguís usando Kumo gratis. Al{' '}
        <strong>eliminar tu cuenta</strong>, todos tus datos asociados (gastos, contactos, recordatorios, espacios
        donde sos dueño) se borran permanentemente. Esta acción no es reversible.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">10. Cambios al servicio</h2>
      <p>
        Podemos modificar o discontinuar funcionalidades. Si discontinuamos la aplicación completa, te avisamos con al
        menos 30 días para que puedas exportar tus datos.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">11. Cambios en estos términos</h2>
      <p>
        Si modificamos estos términos te avisamos por email y dentro de la app. Los cambios significativos requieren
        tu aceptación para seguir usando Kumo.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">12. Ley aplicable</h2>
      <p>Estos términos se rigen por la legislación de Argentina, sin perjuicio de los derechos del consumidor.</p>

      <h2 className="text-xl font-bold mt-8 mb-3">13. Contacto</h2>
      <p>
        Consultas sobre estos términos: <a href="mailto:info@kumo-app.com">info@kumo-app.com</a>
      </p>
    </div>
  );
};

export default TermsPage;
