import type { TableHTMLAttributes } from 'react';

export function Table({ className = '', ...props }: Readonly<TableHTMLAttributes<HTMLTableElement>>) {
  return (
    <div className="table-scroll">
      <table className={`table ${className}`} {...props} />
    </div>
  );
}

