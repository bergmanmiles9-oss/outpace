export function onRequest(context) {
  return context.env.AUTH.fetch(context.request);
}
