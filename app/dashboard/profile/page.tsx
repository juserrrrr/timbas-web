"use client"

import type React from "react"

import { useState } from "react"
import { Camera, User, Mail, Hash, Calendar } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function ProfilePage() {
  const [name, setName] = useState("ProGamer")
  const [avatar, setAvatar] = useState("/user-avatar.jpg")
  const [isEditing, setIsEditing] = useState(false)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatar(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    setIsEditing(false)
    // Here you would save to backend/Discord
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Meu Perfil</h1>
        <p className="text-gray-400">Gerencie suas informações pessoais</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Avatar Card */}
        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm lg:col-span-1">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-gray-700/50 ring-4 ring-blue-500/20">
                <AvatarImage src={avatar || "/placeholder.svg"} alt={name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-red-600 text-4xl font-bold text-white">
                  ?
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-gray-700 bg-gray-800 transition-all hover:border-blue-500 hover:bg-gray-700"
              >
                <Camera className="h-5 w-5 text-gray-300" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">{name}</h2>
              <p className="text-sm text-gray-400">#1234</p>
            </div>
            <Button
              variant="outline"
              className="w-full border-gray-700 bg-gray-800/50 text-white hover:bg-gray-700"
              onClick={() => document.getElementById("avatar-upload")?.click()}
            >
              <Camera className="mr-2 h-4 w-4" />
              Alterar Foto
            </Button>
          </div>
        </Card>

        {/* Profile Info Card */}
        <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <User className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Informações Pessoais</h2>
                <p className="text-sm text-gray-400">Atualize seus dados do perfil</p>
              </div>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} className="bg-blue-600 text-white hover:bg-blue-700">
                Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="border-gray-700 bg-gray-800/50 text-white hover:bg-gray-700"
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave} className="bg-blue-600 text-white hover:bg-blue-700">
                  Salvar
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 text-white">
                <User className="h-4 w-4 text-gray-400" />
                Nome de Usuário
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
                className="border-gray-700 bg-gray-800/50 text-white disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-white">
                <Mail className="h-4 w-4 text-gray-400" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value="progamer@discord.com"
                disabled
                className="border-gray-700 bg-gray-800/50 text-white disabled:opacity-50"
              />
              <p className="text-xs text-gray-500">Email vinculado ao Discord (não editável)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discriminator" className="flex items-center gap-2 text-white">
                <Hash className="h-4 w-4 text-gray-400" />
                Discriminador
              </Label>
              <Input
                id="discriminator"
                value="#1234"
                disabled
                className="border-gray-700 bg-gray-800/50 text-white disabled:opacity-50"
              />
              <p className="text-xs text-gray-500">Tag do Discord (não editável)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="joined" className="flex items-center gap-2 text-white">
                <Calendar className="h-4 w-4 text-gray-400" />
                Membro desde
              </Label>
              <Input
                id="joined"
                value="15 de Janeiro, 2024"
                disabled
                className="border-gray-700 bg-gray-800/50 text-white disabled:opacity-50"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Stats Card */}
      <Card className="border-gray-800/50 bg-gray-900/50 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-lg font-bold text-white">Estatísticas Rápidas</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Partidas Jogadas", value: "156", color: "blue" },
            { label: "Vitórias", value: "89", color: "green" },
            { label: "Taxa de Vitória", value: "57%", color: "purple" },
            { label: "Posição no Ranking", value: "#4", color: "red" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-gray-800/50 bg-black/30 p-4 text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}