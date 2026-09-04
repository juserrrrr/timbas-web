export type EaClubPlatform = "common-gen5" | (string & {});

export interface EaClub {
  id: string;
  externalClubId: string;
  name: string;
  platform: EaClubPlatform;
  nickname?: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string | null;
  eaStatsUpdatedAt?: string | null;
}

export interface EaClubPreview {
  externalClubId: string;
  name: string;
  platform: EaClubPlatform;
}

export interface EaClubDashboard {
  club: EaClub;
  eaAllTimeStats?: {
    gamesPlayed?: number | null;
    wins?: number | null;
    draws?: number | null;
    losses?: number | null;
    goalsFor?: number | null;
    goalsAgainst?: number | null;
    updatedAt?: string | null;
  } | null;
}

export interface EaClubPlayer {
  id: string;
  clubId: string;
  externalPlayerId?: string | null;
  playerName: string;
  appearances?: number;
  careerGames?: number | null;
  careerGoals?: number | null;
  careerAssists?: number | null;
  careerMvps?: number | null;
  careerRating?: number | null;
  careerStatsUpdatedAt?: string | null;
  eaClubGames?: number | null;
  eaClubGoals?: number | null;
  eaClubAssists?: number | null;
  eaClubMvps?: number | null;
  eaClubRating?: number | null;
  eaClubPassesMade?: number | null;
  eaClubPassSuccessRate?: number | null;
  eaClubTacklesMade?: number | null;
  eaClubTackleSuccessRate?: number | null;
  eaClubShotSuccessRate?: number | null;
  eaClubCleanSheetsDef?: number | null;
  eaClubCleanSheetsGk?: number | null;
  eaClubRedCards?: number | null;
  eaClubStatsUpdatedAt?: string | null;
}

export interface EaPlayerPositionAnalysis {
  position: string;
  appearances: number;
  averageRating?: number | null;
  goals: number;
  assists: number;
  goalContributions: number;
  passesCompleted: number;
  passAccuracy?: number | null;
  tacklesCompleted: number;
  tackleAccuracy?: number | null;
  saves: number;
  mvps: number;
}

export interface EaPlayerRecentPositionAnalysis
  extends EaPlayerPositionAnalysis {
  shots: number;
  shotConversion?: number | null;
}

export interface EaPlayerInsight {
  metric: string;
  message: string;
}

export interface EaPlayerRecentAnalysis {
  windowSize: number;
  matchesAvailable: number;
  primaryPosition?: string | null;
  positionAnalysis: EaPlayerRecentPositionAnalysis[];
  appearances: number;
  averageRating?: number | null;
  goals: number;
  assists: number;
  goalContributions: number;
  shots: number;
  shotConversion?: number | null;
  passesCompleted: number;
  passAccuracy?: number | null;
  tacklesCompleted: number;
  tackleAccuracy?: number | null;
  saves: number;
  mvps: number;
  strengths: EaPlayerInsight[];
  improvements: EaPlayerInsight[];
}

export interface EaClubPlayerProfile extends EaClubPlayer {
  positionAnalysis: EaPlayerPositionAnalysis[];
  mostPlayedPosition?: string | null;
  bestPosition?: string | null;
  positionAnalysisMinimumAppearances: number;
  recentAnalysis: EaPlayerRecentAnalysis;
}

export interface EaLeaderboardEntry {
  player: EaClubPlayer;
  value: number;
  appearances?: number;
}

export interface EaLeaderboardCategory {
  key: string;
  label: string;
  entries: EaLeaderboardEntry[];
  minimumMatches?: number;
  source?: "EA_CAREER" | "EA_CLUB";
}

export interface EaSyncResult {
  imported: number;
  skipped?: number;
  failed?: number;
  errors?: string[];
  lastSyncAt?: string;
}

export interface EaClubFieldPlayer {
  id: string;
  playerName: string;
  position: string;
  rating?: number | null;
  appearances: number;
}

export interface EaClubField {
  match: { playedAt: string } | null;
  formation: string | null;
  summary: { matches: number; wins: number; draws: number } | null;
  players: EaClubFieldPlayer[];
  history: Array<{
    id: string;
    playedAt: string;
    result: "WIN" | "DRAW" | "LOSS";
    opponentName: string;
    goalsFor: number;
    goalsAgainst: number;
    positions: {
      goalkeeper: number;
      defense: number;
      midfield: number;
      attack: number;
    };
  }>;
}
