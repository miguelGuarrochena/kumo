import { CloudLogo } from './CloudLogo';

type Props = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export const EmptyState = ({ title, description, action }: Props) => (
  <div className="kumo-card p-12 text-center">
    <CloudLogo className="w-16 h-16 mx-auto mb-4 cloud-float opacity-70" />
    <h3 className="font-semibold text-lg mb-1">{title}</h3>
    <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">{description}</p>
    {action}
  </div>
);
