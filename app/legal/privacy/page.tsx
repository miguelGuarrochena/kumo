import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Cómo Kumo trata tus datos personales y financieros.',
};

const UPDATED = '16 de mayo de 2026';

export default function PrivacyPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Política de privacidad</h1>
      <p className="text-xs text-slate-500 dark:text-slate-500 mb-6">Actualizada el {UPDATED}</p>

      <p>
        En Kumo (&ldquo;nosotros&rdquo;, &ldquo;la aplicación&rdquo;) tu privacidad es una prioridad. Esta política
        explica qué datos recopilamos, cómo los usamos y qué derechos tenés sobre ellos. Si tenés dudas, escribinos
        a <a href="mailto:info@kumo-app.com">info@kumo-app.com</a>.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">1. Qué datos recopilamos</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Cuenta</strong>: email, nombre y foto de perfil (los provee Google al iniciar sesión con OAuth).
        </li>
        <li>
          <strong>Datos financieros</strong>: gastos, vencimientos, categorías, moneda, recordatorios y listas de
          compras que vos cargás.
        </li>
        <li>
          <strong>Contactos para notificaciones</strong>: números de WhatsApp que vos elegís agregar para enviar
          recordatorios.
        </li>
        <li>
          <strong>Fotos de tickets</strong>: si usás la función de cargar gasto desde foto, la imagen se envía a un
          proveedor de OCR (Google Gemini) para extraer los datos. <strong>No guardamos la foto</strong>: una vez
          extraídos los datos, la imagen se descarta.
        </li>
        <li>
          <strong>Datos técnicos básicos</strong>: dirección IP, tipo de navegador y registros mínimos para detectar
          abusos y mantener la app funcionando.
        </li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-3">2. Para qué usamos tus datos</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Mostrarte tu información personal dentro de la aplicación.</li>
        <li>Enviar recordatorios por WhatsApp a los contactos que vos elegiste.</li>
        <li>Procesar tickets con OCR para acelerar la carga de gastos.</li>
        <li>Mejorar la aplicación analizando uso agregado y anónimo (no individual).</li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-3">3. Con quién compartimos datos</h2>
      <p>
        Kumo no vende ni alquila datos personales a terceros. Compartimos datos solo con los proveedores estrictamente
        necesarios para que la app funcione:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Supabase</strong> (Estados Unidos): base de datos y autenticación. Los datos se almacenan cifrados.
        </li>
        <li>
          <strong>Vercel</strong> (Estados Unidos): hosting de la aplicación.
        </li>
        <li>
          <strong>Google (Gemini API)</strong>: procesamiento de imágenes de tickets vía OCR. Las imágenes se envían
          en cada solicitud y no se almacenan ni se usan para entrenar modelos (configuración pagada o tier aplicable).
        </li>
        <li>
          <strong>Meta (WhatsApp Business API)</strong>: envío de mensajes a los números que vos cargues como
          destinatarios.
        </li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-3">4. Tus derechos</h2>
      <p>En cualquier momento podés:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Ver toda tu información dentro de la app.</li>
        <li>Editar o eliminar gastos, recordatorios, contactos y categorías.</li>
        <li>
          Solicitar la eliminación completa de tu cuenta escribiendo a{' '}
          <a href="mailto:info@kumo-app.com">info@kumo-app.com</a>. Procesamos la baja en hasta 30 días.
        </li>
        <li>Exportar tus datos en formato JSON o CSV (próximamente desde Configuración).</li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-3">5. Seguridad</h2>
      <p>
        Aplicamos Row Level Security (RLS) en Postgres: a nivel base de datos, cada usuario solo puede ver y modificar
        sus propios datos. Las conexiones usan HTTPS. Las API keys de proveedores externos se guardan exclusivamente
        del lado del servidor.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">6. Cookies</h2>
      <p>
        Usamos solo cookies esenciales para mantenerte logueado (sesión de Supabase). No usamos cookies publicitarias
        ni de terceros para tracking.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">7. Menores de edad</h2>
      <p>Kumo no está dirigida a menores de 13 años. Si detectamos una cuenta de un menor, la eliminamos.</p>

      <h2 className="text-xl font-bold mt-8 mb-3">8. Cambios en esta política</h2>
      <p>
        Si actualizamos esta política te lo avisamos por email y dentro de la aplicación. La versión más reciente
        siempre está disponible en /legal/privacy.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">9. Contacto</h2>
      <p>
        Cualquier consulta sobre privacidad: <a href="mailto:info@kumo-app.com">info@kumo-app.com</a>
      </p>
    </div>
  );
}
