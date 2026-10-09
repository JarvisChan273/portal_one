export type UserRecord = {
  id: string;
  email: string;
};

export type CatalogSite = {
  id: string;
  categorySlug: string;
  categoryName: string;
  name: string;
  url: string;
  host: string;
  description: string;
  featured: boolean;
};

export type SavedLink = {
  id: string;
  title: string;
  url: string;
  host: string;
  pinned: boolean;
  groupId: string | null;
  sortOrder: number;
  openCount: number;
  lastOpenedAt: string | null;
  catalogSiteId: string | null;
};

export type PortalGroup = {
  id: string;
  name: string;
  sortOrder: number;
  links: SavedLink[];
};

export type CatalogIndexItem = {
  id: string;
  name: string;
  host: string;
  url: string;
};

export type SaveHit = {
  id: string;
  title: string;
  host: string;
};
