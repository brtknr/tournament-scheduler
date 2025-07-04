import { Component, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { TournamentModel, ParticipantModel, MatchModel } from '../models/tournament.model';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

@Component({
  selector: 'app-tournament-form',
  templateUrl: './tournament-form.component.html',
  styleUrls: ['./tournament-form.component.css']
})
export class TournamentFormComponent {
  formModel: TournamentModel = {
    id: this.generateTournamentId(),
    tournamentName: '',
    tournamentType: 'grup',
    matchType: 'tek',
    averageType: 'genel',
    groupCount: null,
    participants: [],
    createdAt: '' // ilk değer
  };

  newParticipantName: string = '';
  newParticipantColor: string = '#2196f3'; // Varsayılan renk
  private participantIdCounter = 1;
  @ViewChildren('participantInput') participantInputs!: QueryList<ElementRef>;
  focusedParticipantIndex: number = -1;
  participantNameExists: boolean = false;

  constructor(private toastr: ToastrService, private router: Router) {}

  addParticipant() {
    const name = this.newParticipantName?.trim();
    if (
      name &&
      !this.formModel.participants.some(p => p.name.toLocaleLowerCase() === name.toLocaleLowerCase())
    ) {
      this.formModel.participants.push({
        id: this.participantIdCounter++,
        name,
        color: this.newParticipantColor || '#2196f3',
        goalsFor: 0,
        goalsAgainst: 0,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        get generalAverage() {
          return this.goalsFor - this.goalsAgainst;
        }
      });
      this.newParticipantName = '';
      // Yeni katılımcı için farklı bir renk ata
      this.newParticipantColor = this.getRandomColor();
      this.participantNameExists = false;
      setTimeout(() => {
        const input = document.querySelector('input[name="newParticipantName"]') as HTMLInputElement;
        input?.focus();
      });
    } else if (
      name &&
      this.formModel.participants.some(p => p.name.toLocaleLowerCase() === name.toLocaleLowerCase())
    ) {
      this.participantNameExists = true;
    } else {
      this.participantNameExists = false;
    }
  }

  removeParticipant(index: number) {
    this.formModel.participants.splice(index, 1);
  }

  clearParticipants() {
    this.formModel.participants = [];
    this.newParticipantName = '';
    this.newParticipantColor = '#2196f3';
    this.participantIdCounter = 1;
  }

  // Signal ile güncelleme için event dispatch
  private notifyTournamentsChanged() {
    window.dispatchEvent(new Event('storage'));
  }

  onSubmit() {
    const validParticipants = this.formModel.participants.filter(p => p.name && p.name.trim() !== '');

    if (!this.formModel.tournamentName.trim()) {
      this.toastr.error('Turnuva adı zorunludur.', 'Hata');
      return;
    }

    if (
      this.formModel.tournamentType === 'grup' &&
      (!this.formModel.groupCount || this.formModel.groupCount < 1)
    ) {
      this.toastr.error('Grup tipi seçiliyse grup sayısı girilmelidir.', 'Hata');
      return;
    }

    if (validParticipants.length < 2) {
      this.toastr.error('En az 2 katılımcı eklemelisiniz.', 'Hata');
      return;
    }

    // Kayıt tarihini güncelle
    this.formModel.createdAt = new Date().toISOString();

    // Her grup için ayrı fikstür hesapla
    let matches: MatchModel[] = [];
    if (this.formModel.tournamentType === 'grup') {
      const groupCount = this.formModel.groupCount || 1;
      const participants = [...validParticipants];
      const groups: ParticipantModel[][] = [];
      for (let i = 0; i < groupCount; i++) groups.push([]);
      participants.forEach((p, idx) => {
        groups[idx % groupCount].push(p);
      });
      let matchId = 1;
      groups.forEach((group) => {
        const groupMatches = this.generateMatchesForGroup(
          group,
          this.formModel.id,
          this.formModel.matchType,
          matchId
        );
        matches = matches.concat(groupMatches);
        matchId += groupMatches.length;
      });
    }

    const tournamentData = {
      ...this.formModel,
      participants: validParticipants,
      matches
    };

    // Çoklu turnuva desteği: localStorage'da "tournaments" dizisi kullanılır
    let tournaments: any[] = [];
    const data = localStorage.getItem('tournaments');
    if (data) {
      tournaments = JSON.parse(data);
    }
    tournaments.push(tournamentData);
    localStorage.setItem('tournaments', JSON.stringify(tournaments));
    localStorage.setItem('tournament', JSON.stringify(tournamentData));
    window.dispatchEvent(new Event('tournamentsChanged'));
    window.dispatchEvent(new Event('tournamentChanged'));

    this.router.navigate(['/fixture']);
  }

  onParticipantEnter() {
    this.addParticipant();
  }

  onParticipantColorChange(index: number, color: string) {
    this.formModel.participants[index].color = color;
  }

  trackByIndex(index: number, item: any) {
    return item.id ?? index;
  }

  private generateTournamentId(): number {
    return Date.now();
  }

  randomizeParticipantColors() {
    const usedColors = new Set<string>();
    for (const participant of this.formModel.participants) {
      let color: string;
      do {
        color = this.getRandomColor();
      } while (usedColors.has(color));
      participant.color = color;
      usedColors.add(color);
    }
  }

  private getRandomColor(): string {
    // Can generate a random hex color
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  // Berger round robin ve özel round kuralı ile maçları oluşturur
  generateMatchesForGroup(
    participants: ParticipantModel[],
    tournamentId: number,
    matchType: 'tek' | 'çift',
    startMatchId: number
  ): MatchModel[] {
    const matches: MatchModel[] = [];
    const n = participants.length;
    let matchId = startMatchId;

    const teamIds = participants.map(p => p.id);
    const isOdd = n % 2 !== 0;
    const teams = isOdd ? [...teamIds, -1] : [...teamIds];
    const totalRounds = teams.length - 1;
    const matchesPerRound = teams.length / 2;
    let rounds: { home: number, away: number }[][] = [];

    let roundTeams = [...teams];
    for (let r = 0; r < totalRounds; r++) {
      const roundMatches: { home: number, away: number }[] = [];
      for (let m = 0; m < matchesPerRound; m++) {
        const home = roundTeams[m];
        const away = roundTeams[roundTeams.length - 1 - m];
        if (home !== -1 && away !== -1) {
          roundMatches.push({ home, away });
        }
      }
      rounds.push(roundMatches);
      roundTeams = [roundTeams[0], roundTeams[roundTeams.length - 1], ...roundTeams.slice(1, -1)];
    }

    // İlk yarı (her takım diğerleriyle bir kez)
    rounds.forEach((roundMatches, i) => {
      roundMatches.forEach(pair => {
        matches.push({
          id: matchId++,
          tournamentId,
          homeTeamId: pair.home,
          awayTeamId: pair.away,
          round: i + 1,
          homeScore: null,
          awayScore: null,
          date: new Date()
        });
      });
    });

    // Çift maç ise: her ilk yarı maçının simetriği, (hafta + totalRounds) olarak ve ev/deplasman ters olarak eklenir
    if (matchType === 'çift') {
      const firstHalfMatches = matches.filter(m => m.round <= totalRounds);
      firstHalfMatches.forEach(m => {
        matches.push({
          id: matchId++,
          tournamentId,
          homeTeamId: m.awayTeamId,
          awayTeamId: m.homeTeamId,
          round: m.round + totalRounds,
          homeScore: null,
          awayScore: null,
          date: new Date()
        });
      });

      // İlk yarıda (totalRounds kadar hafta) hiçbir takım üst üste 3 iç/dış saha oynamasın
      const participantIds = participants.map(p => p.id);
      const firstHalfRounds: { [round: number]: MatchModel[] } = {};
      matches.filter(m => m.round <= totalRounds).forEach(m => {
        if (!firstHalfRounds[m.round]) firstHalfRounds[m.round] = [];
        firstHalfRounds[m.round].push(m);
      });

      // Her takım için ilk yarı home/away geçmişini oluştur
      const teamHomeAway: { [id: number]: string[] } = {};
      participantIds.forEach(id => teamHomeAway[id] = []);
      for (let r = 1; r <= totalRounds; r++) {
        for (const match of firstHalfRounds[r] || []) {
          teamHomeAway[match.homeTeamId].push('H');
          teamHomeAway[match.awayTeamId].push('A');
        }
      }

      // Kontrol ve düzeltme işlemi
      let changed = false;
      do {
        changed = false;
        for (const id of participantIds) {
          const arr = teamHomeAway[id];
          for (let i = 0; i < arr.length - 2; i++) {
            if (arr[i] === arr[i + 1] && arr[i] === arr[i + 2]) {
              // Ortadaki maçın round ve home/away bilgisini bul
              const roundIdx = i + 1;
              const roundNum = roundIdx + 1;
              const match = (firstHalfRounds[roundNum] || []).find(
                m => m.homeTeamId === id || m.awayTeamId === id
              );
              if (match) {
                // Home/away swap et
                const tmp = match.homeTeamId;
                match.homeTeamId = match.awayTeamId;
                match.awayTeamId = tmp;
                // Skorları da swap et (varsa)
                if (typeof match.homeScore !== 'undefined' && typeof match.awayScore !== 'undefined') {
                  const tmpScore = match.homeScore;
                  match.homeScore = match.awayScore;
                  match.awayScore = tmpScore;
                }
                // Home/away geçmişini güncelle
                // Tüm geçmişi baştan oluştur
                participantIds.forEach(pid => teamHomeAway[pid] = []);
                for (let rr = 1; rr <= totalRounds; rr++) {
                  for (const m of firstHalfRounds[rr] || []) {
                    teamHomeAway[m.homeTeamId].push('H');
                    teamHomeAway[m.awayTeamId].push('A');
                  }
                }
                changed = true;
                break;
              }
            }
          }
          if (changed) break;
        }
      } while (changed);
    }

    return matches;
  }
}

