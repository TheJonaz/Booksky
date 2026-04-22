import { getDefaultCompany, getCurrentFiscalYear } from '$lib/server/company.js';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async () => {
  const company = await getDefaultCompany();
  const fy = await getCurrentFiscalYear(company.id);
  return {
    company: { id: company.id, name: company.name, form: company.form, orgNumber: company.orgNumber },
    fiscalYear: { id: fy.id, startDate: fy.startDate, endDate: fy.endDate, status: fy.status }
  };
};
