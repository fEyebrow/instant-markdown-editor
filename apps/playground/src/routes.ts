const baseUrl = import.meta.env.BASE_URL;
const basePath = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

export const editorPath = `${basePath}/`;
export const specsPath = `${basePath}/specs`;

export function isSpecsPath(pathname: string): boolean {
  return pathname === specsPath || pathname === `${specsPath}/`;
}
