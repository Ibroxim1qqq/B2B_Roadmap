export type DataSource = 'dshk' | 'uysot';

const uysotCompanyIds = new Set<string>(['uysot']);

/** Called with what the server reports, because admin-created companies get generated ids. */
export function rememberCompanyDataSource(companyId?: string | null, dataSource?: string | null): void {
  if (!companyId || !dataSource) return;
  if (dataSource === 'uysot') uysotCompanyIds.add(companyId);
  else uysotCompanyIds.delete(companyId);
}

export function isUysotCompany(companyId?: string | null): boolean {
  return Boolean(companyId) && uysotCompanyIds.has(String(companyId).trim());
}
