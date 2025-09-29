// src/routes/OauthMpRoute.tsx
import * as React from 'react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase';
const EDGE_URL = 'https://qhyclhodgrlqmxdzcfgz.supabase.co/functions/v1/oauth-mp'
const REDIRECT_BASE = '/mercadopago/autorizacion'

function toOkPath(estado: 1 | 2, identificador: string) {
  return `${REDIRECT_BASE}/${estado}/${encodeURIComponent(identificador || '')}`
}

function toErrPath(identificador: string, reason: string) {
  return `${REDIRECT_BASE}/3/${encodeURIComponent(identificador || '')}/${encodeURIComponent(reason || 'exchange_failed')}`
}

export default function OauthMpRoute() {
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const [msg, setMsg] = useState('Conectando con Mercado Pago…')
  const [detail, setDetail] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const code = search.get('code') || ''
      const state = search.get('state') || ''

      if (!code) return navigate(toErrPath('', 'missing_code'), { replace: true })
      if (!state) return navigate(toErrPath('', 'missing_state'), { replace: true })

      // (Opcional) Anti-CSRF: comparar con lo guardado al iniciar el flujo
      const expected = sessionStorage.getItem('mp_state')
      if (expected && expected !== state) {
        return navigate(toErrPath('', 'invalid_state'), { replace: true })
      }

      try {
        setMsg('Intercambiando credenciales…')

        const { data, error } = await supabase.functions.invoke('oauth-mp', {
          method: 'POST',
          body: { code, state },
        });

        if (error || !data?.ok) {
          const ident = data?.identificador || '';
          const reason = data?.error || `invoke_error`;
          return navigate(`/mercadopago/autorizacion/3/${encodeURIComponent(ident)}/${encodeURIComponent(reason)}`, { replace: true });
        }

        const ident = data.identificador || '';
        const estado: 1 | 2 = data.refreshed ? 2 : 1;
        return navigate(`/configuracion}`, { replace: true });
      } catch {
        setMsg('No pudimos completar la conexión.')
        setDetail('Error inesperado al contactar el servidor.')
        return navigate(toErrPath('', 'unexpected_error'), { replace: true })
      }
    }

    run()
    // solo al montar (no dependas de navigate para evitar loops)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md px-6 py-8 border border-gray-700 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-3 w-3 rounded-full animate-pulse bg-sky-500" />
          <h1 className="text-lg font-semibold">Conectando…</h1>
        </div>
        <p className="text-sm text-gray-300">{msg}</p>
        {detail && <p className="mt-3 text-xs text-gray-400">{detail}</p>}
        <div className="mt-6">
          <a href="/configuracion" className="inline-flex items-center px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm">
            Volver a Configuración
          </a>
        </div>
      </div>
    </div>
  )
}
