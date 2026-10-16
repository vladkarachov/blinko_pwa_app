import React from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { Zap, FileText, CheckSquare } from 'lucide-react';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';

function isActivePath(searchPath: string | null, target: string): boolean {
  if (target === '/') return searchPath === null;
  return searchPath === target.replace('/?path=', '');
}

/** Official mobile bottom bar: blinko / notes / todo (+ spring hide on scroll). */
export const MobileNavBar: React.FC = () => {
  const visible = useHideOnScroll();
  const [searchParams] = useSearchParams();
  const path = searchParams.get('path');

  const items = [
    { to: '/', label: 'Blinko', icon: Zap, active: isActivePath(path, '/') },
    { to: '/?path=notes', label: 'Notes', icon: FileText, active: isActivePath(path, '/?path=notes') },
    { to: '/?path=todo', label: 'Todo', icon: CheckSquare, active: isActivePath(path, '/?path=todo') },
  ];

  return (
    <nav
      className="blinko-bottom-bar md:hidden fixed bottom-0 z-50 w-full px-3 py-2 transition-transform duration-300"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        background: 'var(--header)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition active:scale-95 ${
                item.active ? 'text-[var(--foreground)]' : 'text-[var(--desc)]'
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={item.active ? 2.4 : 1.8} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
