import appConfig from "./config.json";

export const metadata = {
  name: appConfig.name,
  slug: appConfig.slug,
  type: appConfig.type,
  variant: appConfig.variant,
  logo: appConfig.logo,
  categories: appConfig.categories,
  description: appConfig.description,
  publisher: appConfig.publisher,
  url: appConfig.url,
} as const;

