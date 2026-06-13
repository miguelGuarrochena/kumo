import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Cómo Kumo trata tus datos personales y financieros.',
};

const UPDATED = '10 de junio de 2026';

const PrivacyPage = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Política de privacidad</h1>
      <p className="text-xs text-slate-500 dark:text-slate-500 mb-6">Actualizada el {UPDATED}</p>

      <p>
        En Kumo (&ldquo;nosotros&rdquo;, &ldquo;la aplicación&rdquo;) tu privacidad es prioridad. Esta política explica
        qué datos recopilamos, cómo los usamos y qué derechos tenés. Si tenés dudas, escribinos a{' '}
        <a href="mailto:info@kumo-app.com">info@kumo-app.com</a>.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">1. Qué datos recopilamos</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Cuenta</strong>: email y, si lo cargás, nombre. Si iniciás sesión con Google, obtenemos también el
          nombre y foto de perfil que Google provee.
        </li>
        <li>
          <strong>Datos financieros</strong>: gastos, vencimientos, categorías, moneda, recordatorios y listas de
          compras que cargás.
        </li>
        <li>
          <strong>Contactos para notificaciones</strong>: números de WhatsApp que vos elegís agregar para enviar
          recordatorios.
        </li>
        <li>
          <strong>Fotos de tickets</strong>: si usás la función OCR, la imagen se envía a Google Gemini para extraer
          los datos. <strong>No guardamos la foto</strong>: una vez procesada, se descarta.
        </li>
        <li>
          <strong>Datos de pago</strong>: si activás un complemento de pago (OCR, WhatsApp automático o combo Kumo Pro),
          MercadoPago procesa el pago. Nosotros guardamos solo el ID de tu suscripción, el tipo de plan y el estado
          (activa, cancelada, etc.) — no vemos ni almacenamos tu tarjeta.
        </li>
        <li>
          <strong>Suscripciones push</strong>: si activás notificaciones del navegador, guardamos la subscription
          endpoint de tu device.
        </li>
        <li>
          <strong>Datos técnicos</strong>: IP, navegador, errores y eventos anónimos de uso para mejorar la app y
          detectar abusos.
        </li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-3">2. Para qué los usamos</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Mostrarte tu información dentro de la app.</li>
        <li>Enviar recordatorios por push notifications y, si tenés el plan correspondiente, WhatsApp automático.</li>
        <li>Procesar tickets con OCR (plan OCR o combo).</li>
        <li>
          Sincronizar a Google Calendar los recordatorios y vencimientos que vos elegís (solo si conectás la cuenta).
        </li>
        <li>Cobrar complementos de pago vía MercadoPago.</li>
        <li>Detectar errores y mejorar la app con datos anónimos agregados.</li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-3">3. Con quién compartimos datos</h2>
      <p>Kumo no vende ni alquila datos. Compartimos solo con proveedores necesarios:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Supabase</strong> (Estados Unidos) — base de datos y autenticación. Datos cifrados en reposo y en
          tránsito.
        </li>
        <li>
          <strong>Vercel</strong> (Estados Unidos) — hosting de la aplicación.
        </li>
        <li>
          <strong>Google Gemini API</strong> — procesa imágenes de tickets vía OCR cuando vos lo iniciás. Las imágenes
          no se almacenan ni se usan para entrenar modelos (tier pagado).
        </li>
        <li>
          <strong>Google Calendar API</strong> — solo si conectás tu cuenta en Configuración → Google Calendar.
          Creamos y actualizamos eventos en <em>tu</em> calendario con recordatorios y vencimientos de gastos que vos
          cargás en Kumo. No leemos ni importamos otros eventos de tu Google Calendar. No usamos esos datos para
          publicidad. Podés desconectar en cualquier momento; al hacerlo dejamos de sincronizar y borramos el token de
          acceso en nuestros servidores.
        </li>
        <li>
          <strong>Meta WhatsApp Business API</strong> — envía mensajes automáticos solo si tenés el plan de WhatsApp
          automático, a los números que vos cargues como destinatarios.
        </li>
        <li>
          <strong>MercadoPago</strong> — procesa pagos de complementos de pago. Aplica su propia política de privacidad.
        </li>
        <li>
          <strong>Resend</strong> — envía emails transaccionales (magic link de login, invitaciones a espacios).
        </li>
        <li>
          <strong>PostHog</strong> — analytics anónimos de uso (eventos, no identificación personal).
        </li>
        <li>
          <strong>Sentry</strong> — captura errores técnicos para corregirlos.
        </li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-3">4. Tus derechos</h2>
      <p>En cualquier momento podés:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Ver, editar y eliminar tu información dentro de la app.</li>
        <li>
          <strong>Eliminar tu cuenta completa</strong> desde Configuración → Eliminar cuenta. La eliminación es
          inmediata y borra todos tus datos asociados (gastos, contactos, espacios donde sos dueño).
        </li>
        <li>Exportar tus gastos a CSV o Excel desde la pantalla de Gastos.</li>
        <li>Cancelar el complemento OCR en cualquier momento desde Configuración → Plan.</li>
        <li>Desconectar Google Calendar desde Configuración → Google Calendar → Desconectar.</li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-3">5. Seguridad</h2>
      <p>
        Aplicamos Row Level Security (RLS) en Postgres: cada usuario solo puede leer y modificar sus propios datos a
        nivel base. Conexiones por HTTPS. API keys de terceros guardadas solo del lado del servidor. Backups
        automáticos diarios.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">6. Cookies</h2>
      <p>Kumo usa cookies en estas categorías:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Esenciales</strong>: sesión de Supabase, idioma, espacio activo. Sin estas la app no funciona.
        </li>
        <li>
          <strong>Analíticas (anónimas)</strong>: PostHog y Vercel Analytics agregan datos de uso para mejorar la app.
          No te identifican personalmente.
        </li>
      </ul>
      <p>No usamos cookies publicitarias ni compartimos datos con redes de tracking.</p>

      <h2 className="text-xl font-bold mt-8 mb-3">7. Menores de edad</h2>
      <p>Kumo no está dirigida a menores de 13 años. Si detectamos una cuenta de un menor, la eliminamos.</p>

      <h2 className="text-xl font-bold mt-8 mb-3">8. Cambios en esta política</h2>
      <p>
        Si la actualizamos te avisamos por email y dentro de la app. La versión más reciente siempre está en{' '}
        <code>/legal/privacy</code>.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">9. Contacto</h2>
      <p>
        Consultas: <a href="mailto:info@kumo-app.com">info@kumo-app.com</a>
      </p>
    </div>
  );
};

export default PrivacyPage;
