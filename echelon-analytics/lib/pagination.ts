import type { DbAdapter, SQLParam } from "./db/adapter.ts";

export interface PaginateOptions {
  sql: string;
  countSql: string;
  params: SQLParam[];
  page: number;
  perPage?: number;
}

export interface PaginateResult<T> {
  rows: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function paginate<T>(
  db: DbAdapter,
  opts: PaginateOptions,
): Promise<PaginateResult<T>> {
  const perPage = opts.perPage ?? 25;

  const countRow = await db.queryOne<{ total: number }>(
    opts.countSql,
    ...opts.params,
  );
  const total = countRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, opts.page), totalPages);

  const rows = await db.query<T>(
    `${opts.sql} LIMIT ? OFFSET ?`,
    ...opts.params,
    perPage,
    (page - 1) * perPage,
  );

  return { rows, total, page, perPage, totalPages };
}
