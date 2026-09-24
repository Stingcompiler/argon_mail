import { Leaf } from 'lucide-react';

export function Brand({ name, tagline }: { name: string; tagline: string }) {
  return (
    <span className="brand">
      <span className="brand-symbol"><Leaf size={25} /><span /></span>
      <span>{name}<small>{tagline}</small></span>
    </span>
  );
}
