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
