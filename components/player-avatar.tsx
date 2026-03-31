"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getDiscordAvatarUrl } from "@/lib/auth"
import { cn } from "@/lib/utils"

interface PlayerAvatarProps {
  name: string
  discordId?: string
  avatar?: string | null
  size?: number
  className?: string
}

export function PlayerAvatar({ name, discordId, avatar, size = 128, className }: PlayerAvatarProps) {
  const url = getDiscordAvatarUrl(discordId, avatar ?? undefined, size)
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <Avatar className={cn(className)}>
      {url && <AvatarImage src={url} alt={name} />}
      <AvatarFallback className="bg-gradient-to-br from-blue-600/40 to-red-600/40 text-xs font-bold text-white">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
