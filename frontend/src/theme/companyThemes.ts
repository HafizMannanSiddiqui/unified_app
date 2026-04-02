import type { ThemeConfig } from 'antd';

export const companyThemes: Record<string, ThemeConfig> = {
  PowerSoft19: {
    token: { colorPrimary: '#FC9C10', borderRadius: 6 },
  },
  Venturetronics: {
    token: { colorPrimary: '#fc3b27', borderRadius: 6 },
  },
  Raythorne: {
    token: { colorPrimary: '#2b3750', borderRadius: 6 },
  },
  AngularSpring: {
    token: { colorPrimary: '#B32B48', borderRadius: 6 },
  },
};

export const defaultTheme: ThemeConfig = {
  token: { colorPrimary: '#1677ff', borderRadius: 6 },
};

export function getThemeForCompany(company: string | null | undefined): ThemeConfig {
  if (!company) return defaultTheme;
  // Match partial company names
  for (const [key, theme] of Object.entries(companyThemes)) {
    if (company.toLowerCase().includes(key.toLowerCase().replace(/\d+/g, ''))) {
      return theme;
    }
  }
  return defaultTheme;
}

export const companyCssVars: Record<string, Record<string, string>> = {
  PowerSoft19: {
    '--brand-primary': '#FC9C10',
    '--brand-primary-light': '#e08a0e',
    '--brand-primary-bg': '#FFF7E6',
    '--brand-accent': '#FC9C10',
    '--brand-sidebar': '#2c1a00',
    '--brand-sidebar-trigger': '#1a1000',
  },
  Venturetronics: {
    '--brand-primary': '#fc3b27',
    '--brand-primary-light': '#e0342a',
    '--brand-primary-bg': '#FFF1F0',
    '--brand-accent': '#fc3b27',
    '--brand-sidebar': '#2a0800',
    '--brand-sidebar-trigger': '#1a0500',
  },
  Raythorne: {
    '--brand-primary': '#2b3750',
    '--brand-primary-light': '#374863',
    '--brand-primary-bg': '#F0F2F5',
    '--brand-accent': '#2b3750',
    '--brand-sidebar': '#1a2233',
    '--brand-sidebar-trigger': '#111a28',
  },
  AngularSpring: {
    '--brand-primary': '#B32B48',
    '--brand-primary-light': '#952440',
    '--brand-primary-bg': '#FFF0F0',
    '--brand-accent': '#B32B48',
    '--brand-sidebar': '#3a0f1a',
    '--brand-sidebar-trigger': '#280a12',
  },
};

export const defaultCssVars: Record<string, string> = {
  '--brand-primary': '#154360',
  '--brand-primary-light': '#1a5276',
  '--brand-primary-bg': '#EBF5FB',
  '--brand-accent': '#e74c3c',
  '--brand-sidebar': '#001529',
  '--brand-sidebar-trigger': '#0a1f2f',
};

export function getCssVarsForCompany(company: string | null | undefined): Record<string, string> {
  if (!company) return defaultCssVars;
  for (const [key, vars] of Object.entries(companyCssVars)) {
    if (company.toLowerCase().includes(key.toLowerCase().replace(/\d+/g, ''))) {
      return vars;
    }
  }
  return defaultCssVars;
}
