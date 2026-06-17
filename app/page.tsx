import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CloudLogo } from '@/components/CloudLogo';
import { CloudDecorations } from '@/components/CloudDecorations';
import { Footer } from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import { LangPill } from '@/components/LangPill';
import {
  Wallet, Bell, ShoppingCart, BarChart3, MessageCircle, Camera, ArrowRight,
  Sparkles, PiggyBank,
} from 'lucide-react';
import { getPricing } from '@/lib/pricing';
import { isWaBillingEnabled } from '@/lib/billing/waBilling';
import { getLocale, getMessages } from '@/lib/i18n/server';

const HomePage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  const locale = await getLocale();
  const m = await getMessages();
  const t = m.landing;
  const waBillingOn = isWaBillingEnabled();
  const pricing = getPricing();

  return (
    <main className="min-h-screen relative overflow-hidden">
      <StructuredData locale={locale} />
      <CloudDecorations />

      {/* Nav */}
      <header className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <CloudLogo className="w-9 h-9" />
          <span className="font-bold text-xl tracking-tight kumo-gradient-text">Kumo</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <LangPill />
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold kumo-gradient text-white shadow-md hover:opacity-90 active:scale-95 transition-all"
          >
            {t.login}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 text-center">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-5">
          Tus gastos,
          <br />
          <span className="kumo-gradient-text">como una nube perfecta</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-6">
          <strong className="text-slate-800 dark:text-slate-200">Gratis:</strong> gastos, dividir cuentas,
          presupuestos, calendario, compras, push y espacios compartidos.
          <span className="block mt-2">
            <strong className="text-slate-800 dark:text-slate-200">Opcional (Pro):</strong> escaneá tickets
            o escribí <em className="not-italic text-sky-600 dark:text-sky-400">«gasté 5000 en el super»</em> con IA.
          </span>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 max-w-xl mx-auto">
          {['Gastos', 'Presupuestos', 'Dividir', 'Calendario', 'Push'].map((label) => (
            <span
              key={label}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-mint-100 dark:bg-mint-500/20 text-mint-700 dark:text-mint-300"
            >
              {label} · gratis
            </span>
          ))}
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300">
            IA · Pro
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl kumo-gradient text-white font-semibold shadow-lg hover:opacity-90 active:scale-95 transition-all"
          >
            Empezar gratis
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#features"
            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 px-4 py-3"
          >
            Ver cómo funciona ↓
          </a>
        </div>

        <p className="mt-6 text-xs text-slate-500 dark:text-slate-500">
          Sin tarjeta. Sin instalación. Privacidad por diseño.
        </p>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
          Todo lo que necesitás para no perder el control
        </h2>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-10 text-sm sm:text-base">
          Sin hojas de Excel, sin recordatorios olvidados.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Feature
            icon={<Wallet className="w-5 h-5" />}
            tone="sky"
            title="Gastos con categorías"
            description="Cargá un gasto en 5 segundos. Filtrá por mes, año, categoría o monto. 8 monedas con conversión en vivo."
          />
          <Feature
            icon={<Camera className="w-5 h-5" />}
            tone="lavender"
            title="Foto del ticket (Pro)"
            description="Sacá una foto y la IA extrae monto, comercio, fecha y categoría. Vos solo confirmás."
          />
          <Feature
            icon={<Sparkles className="w-5 h-5" />}
            tone="lavender"
            title="Lenguaje natural (Pro)"
            description="Escribí «gasté 5000 en el super» en Buscar (⌘K). Mismo plan Pro que el escaneo OCR."
          />
          <Feature
            icon={<PiggyBank className="w-5 h-5" />}
            tone="mint"
            title="Presupuestos"
            description="Tope mensual total o por categoría. Aviso push al 80% y si te pasás. Gratis."
          />
          <Feature
            icon={<MessageCircle className="w-5 h-5" />}
            tone="mint"
            title="WhatsApp"
            description="Avisá manualmente por WhatsApp (gratis) o activá avisos automáticos con plan de pago. Push siempre gratis."
          />
          <Feature
            icon={<Bell className="w-5 h-5" />}
            tone="rose"
            title="Recordatorios"
            description="Citas médicas, cumpleaños, lo que necesites. Con anticipación configurable."
          />
          <Feature
            icon={<BarChart3 className="w-5 h-5" />}
            tone="peach"
            title="Métricas claras"
            description="Cuánto, en qué y cuándo. Gráficos por categoría, evolución temporal y comparativas mes a mes."
          />
          <Feature
            icon={<ShoppingCart className="w-5 h-5" />}
            tone="sky"
            title="Lista de compras"
            description="Múltiples listas (supermercado, farmacia). Tickeá mientras comprás. Limpiá con un click."
          />
        </div>
      </section>

      {/* Paid add-ons */}
      <section id="plans" className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Kumo es gratis</h2>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-8 text-sm sm:text-base">
          Gastos, recordatorios, compras, push, espacios y WhatsApp manual — sin costo. Solo pagás lo que tiene costo de terceros.
        </p>

        <div className="space-y-3">
          {([
            { icon: Camera, title: 'IA para gastos', price: pricing.ocr.monthly, desc: 'Escaneá tickets o escribí en lenguaje natural. Gemini interpreta, vos confirmás.', available: true, highlight: !waBillingOn },
            { icon: MessageCircle, title: 'WhatsApp automático', price: pricing.wa.monthly, desc: 'Kumo avisa solo antes de vencimientos y recordatorios.', available: waBillingOn },
            { icon: Wallet, title: 'Kumo Pro (combo)', price: pricing.bundle.monthly, desc: 'Escaneá tickets y que Kumo avise solo por WhatsApp.', available: waBillingOn, highlight: waBillingOn },
          ] as { icon: typeof Camera; title: string; price: string; desc: string; available: boolean; highlight?: boolean }[]).map(({ icon: Icon, title, price, desc, available, highlight }) => (
            <div
              key={title}
              className={`kumo-card p-5 sm:p-6 border-2 ${highlight ? 'border-amber-300/60 dark:border-amber-500/40' : 'border-slate-200/80 dark:border-slate-700'} ${!available ? 'opacity-75' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${highlight ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600' : 'bg-sky-100 dark:bg-sky-500/20 text-sky-600'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    {!available && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-medium">
                        Próximamente
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{desc}</p>
                  <p className="text-sm font-bold mt-2">
                    {available ? `${price}/mes` : 'En revisión con Meta'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-500 text-center mt-6">
          Precios en pesos argentinos. Podemos ajustarlos si suben mucho los costos internacionales, con aviso previo.
        </p>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
          Empezar es facilísimo
        </h2>
        <ol className="space-y-6">
          <Step
            n="1"
            title="Entrá con Google o email"
            description="Un click con Google o un magic link a tu casilla. Sin contraseñas ni formularios largos."
          />
          <Step
            n="2"
            title="Cargá tus primeros gastos"
            description="A mano, con la cámara, escribiendo «gasté X en Y» (Pro) o dejando que Kumo detecte gastos repetidos."
          />
          <Step
            n="3"
            title="Activá avisos (opcional)"
            description="Push gratis siempre. WhatsApp manual gratis. Automático con plan de pago si lo querés."
          />
        </ol>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
        <CloudLogo className="w-16 h-16 mx-auto mb-4" />
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">Empezá hoy. Es gratis.</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm sm:text-base">
          Tardás menos en empezar que en armar un Excel.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl kumo-gradient text-white font-semibold shadow-lg hover:opacity-90 active:scale-95 transition-all"
        >
          Crear mi cuenta
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <Footer variant="public" />
    </main>
  );
};

export default HomePage;

type FeatureProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: 'sky' | 'lavender' | 'mint' | 'peach' | 'rose';
};

const Feature = ({ icon, title, description, tone }: FeatureProps) => {
  const toneStyles = {
    sky:      'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
    lavender: 'bg-lavender-100 text-lavender-500 dark:bg-lavender-500/20',
    mint:     'bg-mint-100 text-mint-500 dark:bg-mint-500/20',
    peach:    'bg-peach-100 text-peach-400 dark:bg-peach-500/20',
    rose:     'bg-rose-100 text-rose-400 dark:bg-rose-500/20',
  };
  return (
    <div className="kumo-card p-5">
      <div className={`w-10 h-10 rounded-xl ${toneStyles[tone]} grid place-items-center mb-3`}>
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
};

type StepProps = { n: string; title: string; description: string };

const Step = ({ n, title, description }: StepProps) => {
  return (
    <li className="flex items-start gap-4">
      <span className="shrink-0 w-9 h-9 rounded-full kumo-gradient text-white grid place-items-center font-bold text-sm shadow-sm">
        {n}
      </span>
      <div>
        <h3 className="font-semibold mb-0.5">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </li>
  );
};
