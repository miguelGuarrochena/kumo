import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CloudLogo } from '@/components/CloudLogo';
import { CloudDecorations } from '@/components/CloudDecorations';
import { Footer } from '@/components/Footer';
import { StructuredData } from '@/components/StructuredData';
import {
  Wallet, Bell, ShoppingCart, BarChart3, MessageCircle, Camera, ArrowRight, Sparkles, Check,
} from 'lucide-react';
import { getPricing } from '@/lib/pricing';

// Landing page pública. Si el user ya está logueado, lo manda al dashboard.

const HomePage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  return (
    <main className="min-h-screen relative overflow-hidden">
      <StructuredData />
      <CloudDecorations />

      {/* Nav */}
      <header className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudLogo className="w-9 h-9" />
          <span className="font-bold text-xl tracking-tight kumo-gradient-text">Kumo</span>
        </div>
        <div className="flex items-center gap-1">
          <a
            href="#pricing"
            className="hidden sm:inline-block px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
          >
            Precios
          </a>
          <Link
            href="/auth/login"
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 dark:bg-slate-800/60 backdrop-blur border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-mint-400 animate-pulse" />
          Beta pública · gratis
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-5">
          Tus gastos,
          <br />
          <span className="kumo-gradient-text">como una nube perfecta</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
          Cargá gastos en segundos, programá vencimientos, recibí avisos por WhatsApp
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
            description="Avisos automáticos antes de cada vencimiento, cita médica o cumpleaños. A vos o a la familia."
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

      {/* Pricing */}
      <section id="pricing" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Precios simples</h2>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-10 text-sm sm:text-base">
          Empezás con 90 días gratis del plan Pro. Después elegís.
        </p>

        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <PricingCard
            title="Free"
            price="$0"
            period="para siempre"
            features={[
              'Gastos, recordatorios, lista de compras',
              'Notificaciones por WhatsApp',
              'Notificaciones push web/mobile',
              '1 espacio personal',
            ]}
          />
          <PricingCard
            title="Pro Mensual"
            price={getPricing().monthly}
            period="/ mes"
            badge="90 días gratis"
            highlight
            features={[
              'Todo lo del Free',
              'OCR de tickets desde foto (Gemini)',
              'Espacios compartidos ilimitados',
              'Sin límite de historial',
            ]}
          />
          <PricingCard
            title="Pro Anual"
            price={getPricing().yearly}
            period="/ año"
            badge={`Ahorrás ${getPricing().yearlyPct}%`}
            features={[
              'Lo mismo que mensual',
              'Pagás 1 vez al año',
              'Mejor relación precio',
            ]}
          />
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-500 mt-6">
          Pagás con MercadoPago. Cancelás cuando quieras desde Configuración.
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
            title="Entrá con Google"
            description="Sin contraseñas, sin formularios. Un click y estás adentro."
          />
          <Step
            n="2"
            title="Cargá tus primeros gastos"
            description="Con la cámara, escribiéndolos o desde un ticket pasado. Vienen categorías por default."
          />
          <Step
            n="3"
            title="Conectá WhatsApp (opcional)"
            description="Agregá tu número y los de quien quieras. Te avisamos antes de cada vencimiento."
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

type PricingCardProps = {
  title: string;
  price: string;
  period: string;
  features: string[];
  badge?: string;
  highlight?: boolean;
};

const PricingCard = ({
  title, price, period, features, badge, highlight,
}: PricingCardProps) => {
  return (
    <div
      className={`relative kumo-card p-6 ${
        highlight ? 'border-amber-300 dark:border-amber-500/50 bg-amber-50/40 dark:bg-amber-500/5' : ''
      }`}
    >
      {badge && (
        <span className="absolute -top-2.5 right-4 text-[10px] px-2.5 py-1 rounded-full bg-amber-500 text-white font-medium shadow-sm">
          {badge}
        </span>
      )}
      <div className="flex items-center gap-2 mb-3">
        {highlight && <Sparkles className="w-4 h-4 text-amber-500" />}
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      <div className="flex items-baseline gap-1.5 mb-5">
        <span className="text-3xl font-bold">{price}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">{period}</span>
      </div>
      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 text-mint-500 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
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
