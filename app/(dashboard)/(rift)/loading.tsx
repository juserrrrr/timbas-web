/// Espera de carga direta na URL. Vive dentro do layout do grupo, então o
/// cabeçalho e as abas já estão na tela e só o miolo aparece esqueleto.
export default function RiftToolsLoading() {
  return (
    <div className="space-y-4">
      <div className="app-skeleton-block h-44 rounded-2xl border border-white/[0.07] bg-white/[0.02]" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="app-skeleton-block h-24 rounded-2xl border border-white/[0.07] bg-white/[0.02]" />
        <div className="app-skeleton-block h-24 rounded-2xl border border-white/[0.07] bg-white/[0.02]" />
      </div>
    </div>
  )
}
