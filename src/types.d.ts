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

type Installation = {
  app_id: number;
  name?: string;
  collapsible: boolean;
  enabled: boolean;
  id: number;
  plan?: string;
  requirements: Array<Record<string, any>>;
  settings: Array<Record<string, any>>;
  updated_at: string;
};

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
