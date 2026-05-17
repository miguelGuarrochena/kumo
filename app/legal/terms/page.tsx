import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Reglas de uso de Kumo.',
};

const UPDATED = '16 de mayo de 2026';

export default function TermsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Términos y condiciones</h1>
      <p className="text-xs text-slate-500 dark:text-slate-500 mb-6">Actualizados el {UPDATED}</p>

      <p>
        Al usar Kumo aceptás estos términos. Si no estás de acuerdo, no uses la aplicación. Si tenés dudas:{' '}
        <a href="mailto:info@kumo-app.com">info@kumo-app.com</a>.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">1. Qué es Kumo</h2>
      <p>
        Kumo es una aplicación web para gestionar finanzas personales: cargar gastos, programar vencimientos, llevar
        recordatorios y recibir avisos por WhatsApp. La aplicación es de uso personal y no constituye asesoramiento
        financiero, contable ni legal.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">2. Cuenta</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Necesitás una cuenta de Google válida para usar Kumo.</li>
        <li>Sos responsable de mantener la seguridad de tu cuenta de Google.</li>
        <li>No podés compartir tu cuenta con terceros.</li>
        <li>Podés cerrar tu cuenta cuando quieras desde la configuración o por email.</li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-3">3. Uso aceptable</h2>
      <p>Al usar Kumo te comprometés a:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>No subir contenido ilegal, ofensivo, fraudulento o que viole derechos de terceros.</li>
        <li>No intentar acceder a datos de otros usuarios.</li>
        <li>No usar la aplicación para enviar spam por WhatsApp ni para fines comerciales no autorizados.</li>
        <li>No realizar ingeniería inversa, scraping masivo ni abusos del servicio.</li>
        <li>
          Cargar únicamente números de WhatsApp de personas que te dieron su consentimiento explícito para
          recibir notificaciones de tu parte.
        </li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-3">4. Servicios de terceros</h2>
      <p>
        Kumo usa proveedores como Supabase, Vercel, Google (Gemini) y Meta (WhatsApp). Su disponibilidad y términos
        pueden afectar la aplicación. No nos hacemos responsables de fallas en servicios de terceros.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">5. Disponibilidad</h2>
      <p>
        Hacemos lo posible para que la aplicación esté siempre disponible, pero no garantizamos un uptime del 100%.
        Podemos hacer mantenimiento programado o tener cortes imprevistos.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">6. Limitación de responsabilidad</h2>
      <p>
        Kumo se ofrece &ldquo;tal cual&rdquo;. En la máxima medida permitida por la ley, no nos hacemos responsables
        de pérdidas indirectas, lucro cesante, ni daños derivados del uso o imposibilidad de uso de la aplicación.
      </p>
      <p>
        Si un recordatorio o notificación de vencimiento falla por cualquier motivo (problemas en WhatsApp, en
        proveedores, en la red), seguís siendo el único responsable por gestionar tus pagos y compromisos.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">7. Cambios al servicio</h2>
      <p>
        Podemos modificar o discontinuar funcionalidades en cualquier momento. Si discontinuamos la aplicación
        completa, te avisaremos con al menos 30 días de anticipación para que puedas exportar tus datos.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">8. Precios</h2>
      <p>
        Hoy Kumo es 100% gratis. Si en el futuro lanzamos un plan pago, los usuarios existentes mantienen acceso al
        plan gratuito y los nuevos features pagos quedan claramente identificados.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">9. Cambios en estos términos</h2>
      <p>
        Si modificamos estos términos te avisamos por email y dentro de la aplicación. Los cambios significativos
        requieren tu aceptación para seguir usando Kumo.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">10. Ley aplicable</h2>
      <p>Estos términos se rigen por la legislación de Argentina, sin perjuicio de los derechos del consumidor.</p>

      <h2 className="text-xl font-bold mt-8 mb-3">11. Contacto</h2>
      <p>
        Para cualquier consulta sobre estos términos:{' '}
        <a href="mailto:info@kumo-app.com">info@kumo-app.com</a>
      </p>
    </div>
  );
}
