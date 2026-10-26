export function guitarRoutes(moduleURL) {
  return {home:new URL('.',moduleURL).pathname,instrument:new URL('star-guitar/',moduleURL).pathname};
}

export function isGuitarPath(pathname,instrumentPath) {
  return pathname.replace(/(?:\/index\.html|\/)$/,'')===instrumentPath.replace(/\/$/,'');
}
