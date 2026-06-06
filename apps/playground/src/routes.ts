const baseUrl = import.meta.env.BASE_URL;
const basePath = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
const baseHref = `${basePath}/`;

export const editorPath = `${baseHref}#/`;
export const specsPath = `${baseHref}#/specs`;

export function isSpecsPath(hash: string): boolean {
  return hash === "#/specs" || hash === "#/specs/";
}
