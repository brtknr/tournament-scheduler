export interface ParticipantModel {
  id: number;
  name: string;
  color: string;
  goalsFor: number;         // Attığı gol
  goalsAgainst: number;     // Yediği gol
  matchesPlayed: number;    // Oynanan maç sayısı
  wins: number;             // Galibiyet sayısı
  draws: number;            // Beraberlik sayısı
  losses: number;           // Mağlubiyet sayısı
  points: number;           // Puan
  get generalAverage(): number; // Genel averaj (getter)
}

export interface MatchModel {
  id: number;
  tournamentId: number;
  homeTeamId: number;
  awayTeamId: number;
  round: number;
  homeScore: number | null;
  awayScore: number | null;
  date: Date;
}

export interface TournamentModel {
  id: number;
  tournamentName: string;
  tournamentType: 'grup' | 'eleme';
  matchType: 'tek' | 'çift';
  averageType: 'genel' | 'ikili';
  groupCount: number | null;
  participants: ParticipantModel[];
  matches?: MatchModel[];
  createdAt: string | Date; // Kayıt tarihi
}
