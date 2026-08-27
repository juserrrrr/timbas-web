const strip = (value: string | undefined) => value?.replace(/\/+$/, "") || undefined

/// Endereço que o browser usa. Vai embutido no bundle, então precisa ser público.
export const PUBLIC_API_URL = strip(process.env.NEXT_PUBLIC_API_URL)

/**
 * Endereço que o servidor Next usa para falar com a API.
 *
 * Os dois processos rodam na mesma máquina, mas o SSR chamava a API pelo
 * domínio público: cada fetch de server component saía para a internet, subia
 * até o Cloudflare e voltava para o vizinho de porta. Uma página que busca duas
 * coisas pagava dois handshakes TLS e dois trajetos completos antes de começar
 * a renderizar.
 *
 * Com API_INTERNAL_URL apontando para o endereço interno essa volta some. Sem a
 * variável definida nada muda, então o deploy pode subir antes da configuração.
 */
const INTERNAL_API_URL = strip(process.env.API_INTERNAL_URL)

export const API_URL =
  typeof window === "undefined" ? INTERNAL_API_URL ?? PUBLIC_API_URL : PUBLIC_API_URL

export function apiBase(): string {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL não configurado")
  return API_URL
}

/**
 * Fetch do servidor com volta para o domínio público.
 *
 * Se API_INTERNAL_URL estiver errada ou o endereço não responder, o fetch
 * estoura e as telas que fazem `.catch(() => [])` renderizariam vazias sem
 * nenhum erro em lugar nenhum. Uma configuração ruim viraria um dashboard em
 * branco silencioso. Aqui ela vira só a lentidão de antes, com um aviso no log
 * para alguém arrumar.
 */
export async function apiServerFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (error) {
    const canFallBack =
      typeof window === "undefined" &&
      INTERNAL_API_URL &&
      PUBLIC_API_URL &&
      INTERNAL_API_URL !== PUBLIC_API_URL &&
      url.startsWith(INTERNAL_API_URL)
    if (!canFallBack) throw error

    console.warn(
      `[api] ${INTERNAL_API_URL} não respondeu, usando ${PUBLIC_API_URL}. ` +
        "Confira API_INTERNAL_URL: enquanto isso o SSR volta a sair pela internet.",
    )
    return fetch(PUBLIC_API_URL + url.slice(INTERNAL_API_URL!.length), init)
  }
}
