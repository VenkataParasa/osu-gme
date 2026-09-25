import { useEffect, useState, type ReactNode } from "react";

export function Pagination({ page, pageSize, total, onPage, onPageSize }: {
  page: number; pageSize: number; total: number;
  onPage: (page: number) => void; onPageSize: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className="table-pagination" aria-label="Table pages">
      <span aria-live="polite">Showing {total ? page * pageSize + 1 : 0}–{Math.min((page + 1) * pageSize, total)} of {total}</span>
      <label>Rows per page <select aria-label="Rows per page" value={pageSize} onChange={e => onPageSize(Number(e.target.value))}>
        {[...new Set([25, 50, 100, pageSize])].sort((a, b) => a - b).map(size => <option key={size} value={size}>{size}</option>)}
      </select></label>
      <div>
        <button type="button" disabled={page === 0} onClick={() => onPage(0)}>First</button>
        <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</button>
        <span>Page {page + 1} of {pages}</span>
        <button type="button" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Next</button>
        <button type="button" disabled={page >= pages - 1} onClick={() => onPage(pages - 1)}>Last</button>
      </div>
    </nav>
  );
}

// Slice records before creating JSX, so off-page rows never render.
export function PagedRows<T>({ rows, children, resetKey = "", initialPageSize = 25 }: {
  rows: T[]; children: (rows: T[]) => ReactNode; resetKey?: string; initialPageSize?: number;
}) {
  const [state, setState] = useState({ page: 0, key: resetKey });
  const [pageSize, setPageSize] = useState(initialPageSize);
  const page = state.key === resetKey ? Math.min(state.page, Math.max(0, Math.ceil(rows.length / pageSize) - 1)) : 0;
  const onPage = (page: number) => setState({ page, key: resetKey });
  useEffect(() => {
    const reset = () => setState({ page: 0, key: resetKey });
    window.addEventListener("hashchange", reset);
    return () => window.removeEventListener("hashchange", reset);
  }, [resetKey]);
  return <>
    {children(rows.slice(page * pageSize, (page + 1) * pageSize))}
    {rows.length > 0 && <Pagination page={page} pageSize={pageSize} total={rows.length} onPage={onPage} onPageSize={size => { setPageSize(size); onPage(0); }} />}
  </>;
}
