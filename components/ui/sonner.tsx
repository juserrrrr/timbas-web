'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * Fica montado uma vez só, no layout raiz, para qualquer tela poder avisar.
 *
 * Canto inferior direito: a barra de cima do dashboard é navegação e o aviso
 * não pode cobrir ela, e no celular o menu de baixo ocupa 56px, daí o
 * afastamento maior. O card em si vem do lib/toast, então aqui é só a caixa: o
 * sonner não desenha nada, só cuida do empilhamento, do arrasto e do relógio.
 */
const Toaster = (props: ToasterProps) => (
  <Sonner
    position="bottom-right"
    offset={{ bottom: 20, right: 20, left: 20 }}
    mobileOffset={{ bottom: 72, right: 12, left: 12 }}
    gap={10}
    visibleToasts={4}
    toastOptions={{ unstyled: true, classNames: { toast: 'w-full' } }}
    style={{ '--width': '380px' } as React.CSSProperties}
    {...props}
  />
)

export { Toaster }
