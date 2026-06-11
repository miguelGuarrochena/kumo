import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CloudLogo } from '@/components/CloudLogo';
import { CloudDecorations } from '@/components/CloudDecorations';
import { Footer } from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import {
  Wallet, Bell, ShoppingCart, BarChart3, MessageCircle, Camera, ArrowRight,
} from 'lucide-react';
import { getPricing } from '@/lib/pricing';
import { getLocale } from '@/lib/i18n/server';

const HomePage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  const locale = await getLocale();

  return (
    <main className="min-h-screen relative overflow-hidden">
      <StructuredData locale={locale} />
      <CloudDecorations />

      {/* Nav */}
      <header className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <CloudLogo className="w-9 h-9" />
          <span className="font-bold text-xl tracking-tight kumo-gradient-text">Kumo</span>
        </Link>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold kumo-gradient text-white shadow-md hover:opacity-90 active:scale-95 transition-all"
        >
          Iniciar sesión
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 text-center">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-5">
          Tus gastos,
          <br />
          <span className="kumo-gradient-text">como una nube perfecta</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
          Cargá gastos en segundos, programá vencimientos, recibí avisos por push
          y nunca te olvides de un cumpleaños ni de pagar el alquiler.
        </p>

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
            title="Foto del ticket"
            description="Sacá una foto del ticket y la IA extrae monto, comercio, fecha y categoría. Vos solo confirmás."
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
            { icon: Camera, title: 'Escaneo OCR', price: getPricing().ocr.monthly, desc: 'Foto del ticket → IA extrae monto y categoría.' },
            { icon: MessageCircle, title: 'WhatsApp automático', price: getPricing().wa.monthly, desc: 'Kumo avisa solo antes de vencimientos y recordatorios.' },
            { icon: Wallet, title: 'Kumo Pro (combo)', price: getPricing().bundle.monthly, desc: 'OCR + WhatsApp automático. Más barato que los dos juntos.', highlight: true },
          ] as { icon: typeof Camera; title: string; price: string; desc: string; highlight?: boolean }[]).map(({ icon: Icon, title, price, desc, highlight }) => (
            <div
              key={title}
              className={`kumo-card p-5 sm:p-6 border-2 ${highlight ? 'border-amber-300/60 dark:border-amber-500/40' : 'border-slate-200/80 dark:border-slate-700'}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${highlight ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600' : 'bg-sky-100 dark:bg-sky-500/20 text-sky-600'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{desc}</p>
                  <p className="text-sm font-bold mt-2">{price}/mes</p>
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
            description="Con la cámara, escribiéndolos o desde un ticket pasado. Vienen categorías por default."
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
