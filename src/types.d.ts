type ManifestParamProps = {
  name: string;
  required?: boolean;
  secured?: boolean;
};

type AuthenticateZendesk = {
  email: string;
  subdomain: string;
  apiToken: string;
};

type ZendeskAppsConfig = {
  ids: Record<string, AppId>;
};

type Manifest = {
  name: string;
  author: Author;
  defaultLocale: string;
  private?: boolean;
  location: Location;
  version?: string;
  frameworkVersion: string;
  singleInstall?: boolean;
  signedUrls?: boolean;
  parameters?: ManifestParameter[];
};

type AppPayload = {
  name: string;
  id: string;
  default_locale: string;
  private: boolean;
  location: Location;
  location_icons: LocationIcons;
  version: string;
  framework_version: string;
  asset_url_prefix: number;
  signed_urls: boolean;
  single_install: boolean;
};

type RoleRestrictions = number[];

interface InstallationParameters
  extends Record<string, string | number | boolean | null> {}

interface InstallationSettings extends InstallationParameters {
  name: string;
}

interface Installation {
  app_id: number;
  name?: string;
  collapsible: boolean;
  enabled: boolean;
  id: number;
  plan?: string;
  requirements: Array<Record<string, any>>;
  settings: InstallationParameters;
  updated_at: string;
  role_restrictions: RoleRestrictions;
}

interface CreateInstallation {
  appId: number;
  settings: InstallationSettings;
  role_restrictions?: RoleRestrictions;
}

interface UpdateInstallation extends CreateInstallation {
  installationId: number;
}

interface CreateApp {
  appLocation: AppLocation;
  parameters: InstallationParameters;
  roleRestrictions?: RoleRestrictions;
}

interface UpdateApp extends CreateApp {
  appId: number;
}

type ManifestParameter = {
  name: string;
  type: string;
  required?: boolean;
  secure?: boolean;
};

type AppId = string | string[];

type AppLocation = {
  path: string;
  type: 'dir' | 'zip';
};

type AppInputs = {
  env: string;
  appPath: string;
  appPackage: string;
  zendeskAppsConfigPath: string;
  params: Record<string, string>;
  appId?: number;
  allowMultipleApps: boolean;
  roleRestrictions?: RoleRestrictions;
};
