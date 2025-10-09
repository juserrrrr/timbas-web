"use client"

import { Bell, Shield, Palette, Globe } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Configurações</h1>
        <p className="text-gray-400">Personalize sua experiência no TimbasBot</p>
      </div>

      <div className="space-y-6">
        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Bell className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Notificações</h2>
              <p className="text-sm text-gray-400">Gerencie suas preferências de notificação</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: "Notificações de Partida", desc: "Receba alertas quando uma partida começar" },
              { label: "Atualizações de Ranking", desc: "Seja notificado sobre mudanças no ranking" },
              { label: "Convites de Time", desc: "Receba notificações de convites para times" },
            ].map((setting) => (
              <div key={setting.label} className="flex items-center justify-between rounded-lg bg-black/30 p-4">
                <div>
                  <Label className="text-white">{setting.label}</Label>
                  <p className="text-sm text-gray-500">{setting.desc}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-700 bg-gray-800/50 text-white hover:bg-gray-700"
                >
                  Ativado
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2">
              <Shield className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Privacidade</h2>
              <p className="text-sm text-gray-400">Controle quem pode ver suas informações</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: "Perfil Público", desc: "Permitir que outros vejam seu perfil" },
              { label: "Estatísticas Visíveis", desc: "Mostrar suas estatísticas para outros jogadores" },
              { label: "Histórico de Partidas", desc: "Permitir visualização do histórico de partidas" },
            ].map((setting) => (
              <div key={setting.label} className="flex items-center justify-between rounded-lg bg-black/30 p-4">
                <div>
                  <Label className="text-white">{setting.label}</Label>
                  <p className="text-sm text-gray-500">{setting.desc}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-700 bg-gray-800/50 text-white hover:bg-gray-700"
                >
                  Ativado
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Palette className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Aparência</h2>
              <p className="text-sm text-gray-400">Personalize a interface do bot</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg bg-black/30 p-4">
              <Label className="mb-3 block text-white">Cor de Destaque</Label>
              <div className="flex gap-3">
                {["bg-blue-500", "bg-red-500", "bg-green-500", "bg-purple-500", "bg-yellow-500"].map((color) => (
                  <button
                    key={color}
                    className={`h-10 w-10 rounded-lg ${color} transition-transform hover:scale-110`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-2">
              <Globe className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Região e Idioma</h2>
              <p className="text-sm text-gray-400">Configure sua região e idioma preferido</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg bg-black/30 p-4">
              <Label className="mb-2 block text-white">Região do Servidor</Label>
              <Button
                variant="outline"
                className="w-full justify-start border-gray-700 bg-gray-800/50 text-white hover:bg-gray-700"
              >
                Brasil (BR)
              </Button>
            </div>
            <div className="rounded-lg bg-black/30 p-4">
              <Label className="mb-2 block text-white">Idioma</Label>
              <Button
                variant="outline"
                className="w-full justify-start border-gray-700 bg-gray-800/50 text-white hover:bg-gray-700"
              >
                Português (BR)
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
