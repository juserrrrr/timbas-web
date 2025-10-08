export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Bem-vindo ao Dashboard</h1>
        <p className="text-gray-400">Gerencie suas partidas e acompanhe seu desempenho</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-xl transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <p className="text-sm text-gray-400 mb-1">Total de Partidas</p>
            <p className="text-3xl font-bold text-white">156</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-xl transition-all hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <p className="text-sm text-gray-400 mb-1">Vitórias</p>
            <p className="text-3xl font-bold text-white">89</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-xl transition-all hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <p className="text-sm text-gray-400 mb-1">Derrotas</p>
            <p className="text-3xl font-bold text-white">67</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-xl transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <p className="text-sm text-gray-400 mb-1">Win Rate</p>
            <p className="text-3xl font-bold text-white">57%</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-black/50 p-6 backdrop-blur-xl">
        <h2 className="text-2xl font-bold text-white mb-4">Atividade Recente</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-gray-800/50 bg-gray-900/30 p-4 transition-all hover:border-gray-700/50 hover:bg-gray-900/50"
            >
              <div>
                <p className="font-medium text-white">Partida #{156 - i}</p>
                <p className="text-sm text-gray-400">
                  Há {i} hora{i > 1 ? "s" : ""}
                </p>
              </div>
              <div
                className={`rounded-lg px-3 py-1 text-sm font-medium ${i % 2 === 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}
              >
                {i % 2 === 0 ? "Vitória" : "Derrota"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
