// All application data uses the same-origin Python API through Vite's proxy.
export interface Fragmento { id: string; seccion: string; texto: string }
export interface Documento {
  id: string; titulo: string; tipo: 'Itinerario' | 'Presupuesto' | 'Catálogo'
  region: string; pais: string; fecha: string; etiqueta: string; fragmentos: Fragmento[]
}
export interface Fuente {
  documento_id: string; titulo: string; tipo: string; fragmento_id: string
  seccion: string; fragmento: string; similitud: number | null
}
export interface Respuesta {
  respuesta: string; fuentes: Fuente[]; consta: boolean
  modelo_consultado: boolean; datos_de_ejemplo: boolean
}
export interface Mensaje { rol: 'user' | 'assistant'; contenido: string }
export interface Etapa {
  ciudad: string; rango: string; dias: number; descripcion: string
  lugares: string[]; traslado: string
}
export interface Ruta {
  id: string; codigo: string; pais: string; continente: string
  titulo: string; titulo_completo: string; dias: number; noches: number; precio: number
  categoria: string; etiqueta: string; descripcion: string; temporada: string; transporte: string
  presupuesto: { concepto: string; importe: number }[]; etapas: Etapa[]; documentos: string[]
}
export interface ListadoRutas {
  total: number; rutas: Ruta[]; origen: string; datos_de_ejemplo: boolean; ruta_por_defecto: string
}
export interface ListadoDocumentos {
  total: number; documentos: Documento[]; origen: string; datos_de_ejemplo: boolean
}
export interface Turno {
  id: string; pregunta: string; estado: 'pending' | 'done' | 'error'
  respuesta?: Respuesta; error?: string; cobertura: boolean
}

class ErrorAPI extends Error {}

async function solicitar<T>(path: string, init: RequestInit = {}, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController()
  const parentSignal = init.signal
  const abort = () => controller.abort()
  if (parentSignal?.aborted) abort()
  else parentSignal?.addEventListener('abort', abort, { once: true })
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
  try {
    const headers = new Headers(init.headers)
    if (init.body) headers.set('Content-Type', 'application/json')
    const response = await fetch(path, { ...init, headers, signal: controller.signal, cache: 'no-store' })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      const detail = typeof body?.detail === 'string' ? body.detail : 'No se pudo completar la solicitud. Inténtalo de nuevo.'
      throw new ErrorAPI(detail)
    }
    if (!body) throw new ErrorAPI('El servidor no ha devuelto una respuesta válida.')
    return body as T
  } catch (error) {
    if (error instanceof ErrorAPI || parentSignal?.aborted) throw error
    throw new ErrorAPI(timedOut
      ? 'La consulta ha tardado demasiado. Puedes volver a intentarlo.'
      : 'No se pudo conectar con el servidor. Comprueba que está en marcha y vuelve a intentarlo.')
  } finally {
    clearTimeout(timer)
    parentSignal?.removeEventListener('abort', abort)
  }
}

export const obtenerRutas = (signal?: AbortSignal) => solicitar<ListadoRutas>('/api/rutas', { signal })
export const obtenerDocumentos = (signal?: AbortSignal) => solicitar<ListadoDocumentos>('/api/documentos', { signal })
export const preguntar = (pregunta: string, historial: Mensaje[], rutaId: string, signal?: AbortSignal) =>
  solicitar<Respuesta>('/api/preguntar', {
    method: 'POST', signal, body: JSON.stringify({ pregunta, historial, ruta_id: rutaId }),
  }, 45000)

export const normalizar = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export const euros = (amount: number) => new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: true,
}).format(amount)
