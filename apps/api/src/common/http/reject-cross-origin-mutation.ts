import type { FastifyReply, FastifyRequest } from 'fastify'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export async function rejectCrossOriginMutation(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (SAFE_METHODS.has(request.method)) return

  const fetchSite = request.headers['sec-fetch-site']

  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return reply.code(403).send({
      error: 'cross_origin_request',
      message: 'La solicitud debe iniciarse desde la aplicación.',
    })
  }

  // The development web proxy changes Host on its internal API hop, but the
  // browser still reports same-origin for requests to /api.
  if (fetchSite === 'same-origin') return

  const origin = request.headers.origin
  if (!origin) return

  let originHost: string
  let requestHost: string
  try {
    const parsedOrigin = new URL(origin)
    originHost = parsedOrigin.host
    requestHost = new URL(`${parsedOrigin.protocol}//${request.headers.host}`).host
  } catch {
    originHost = ''
    requestHost = ''
  }

  if (!originHost || originHost !== requestHost) {
    return reply.code(403).send({
      error: 'cross_origin_request',
      message: 'La solicitud debe iniciarse desde la aplicación.',
    })
  }
}
