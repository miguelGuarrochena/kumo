// Decoraciones de fondo: nubecitas pastel flotando, ambient.

export function CloudDecorations() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      <SoftCloud className="absolute top-10 -left-10 w-64 cloud-drift" color="#dbeafe" />
      <SoftCloud className="absolute top-32 right-20 w-48 cloud-float" color="#ede9fe" />
      <SoftCloud className="absolute bottom-20 left-1/3 w-72 cloud-drift" color="#fce7f3" delay="2s" />
      <SoftCloud className="absolute bottom-48 right-10 w-56 cloud-float" color="#dcfce7" delay="4s" />
    </div>
  );
}

function SoftCloud({
  className,
  color,
  delay = '0s',
}: {
  className?: string;
  color: string;
  delay?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 120"
      className={className}
      style={{ animationDelay: delay }}
      fill={color}
      opacity="0.6"
    >
      <ellipse cx="60" cy="80" rx="50" ry="30" />
      <ellipse cx="100" cy="60" rx="55" ry="35" />
      <ellipse cx="140" cy="80" rx="45" ry="28" />
      <ellipse cx="80" cy="55" rx="35" ry="25" />
      <ellipse cx="125" cy="50" rx="30" ry="22" />
    </svg>
  );
}
