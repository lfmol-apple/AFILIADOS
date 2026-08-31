import type { ReactNode } from "react";

export type RouteParams<T extends Record<string, string | string[]>> = {
  params: Promise<T>;
};

export type SearchParams = Record<string, string | string[] | undefined>;

export type PagePropsWithParams<T extends Record<string, string | string[]>> =
  RouteParams<T> & {
    searchParams: Promise<SearchParams>;
  };

export type PagePropsWithSearch = {
  searchParams: Promise<SearchParams>;
};

export type AppLayoutProps = {
  children: ReactNode;
};
