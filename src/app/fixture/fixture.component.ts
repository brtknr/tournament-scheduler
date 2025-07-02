import { Component, OnInit, OnDestroy } from '@angular/core';
import { TournamentModel, ParticipantModel, MatchModel } from '../models/tournament.model';

@Component({
  selector: 'app-fixture',
  templateUrl: './fixture.component.html',
  styleUrls: ['./fixture.component.css']
})
export class FixtureComponent implements OnInit, OnDestroy {
  tournament: TournamentModel | null = null;
  groups: { [groupName: string]: ParticipantModel[] } = {};
  groupFixtures: { [groupName: string]: MatchModel[] } = {};
  groupedFixtures: { [groupName: string]: { [round: number]: MatchModel[] } } = {};

  private tournamentChangedHandler = () => this.loadTournamentAndPrepare();

  ngOnInit() {
    this.loadTournamentAndPrepare();
    window.addEventListener('storage', () => this.loadTournamentAndPrepare());
    window.addEventListener('tournamentsChanged', () => this.loadTournamentAndPrepare());
    window.addEventListener('tournamentChanged', this.tournamentChangedHandler);
  }

  ngOnDestroy() {
    window.removeEventListener('tournamentChanged', this.tournamentChangedHandler);
  }

  loadTournamentAndPrepare() {
    const data = localStorage.getItem('tournament');
    if (data) {
      this.tournament = JSON.parse(data);
      if (this.tournament?.tournamentType === 'grup') {
        this.prepareGroupsAndFixtures();
      }
    }
  }

  prepareGroupsAndFixtures() {
    if (!this.tournament) return;
    // Grupları ve fikstürleri her seferinde temizle
    this.groups = {};
    this.groupFixtures = {};
    this.groupedFixtures = {};

    const groupCount = this.tournament.groupCount || 1;
    const participants = [...this.tournament.participants];
    for (let i = 0; i < groupCount; i++) {
      this.groups['Grup ' + (i + 1)] = [];
    }
    participants.forEach((p, idx) => {
      const groupIdx = idx % groupCount;
      this.groups['Grup ' + (groupIdx + 1)].push(p);
    });

    // Her grup için ilgili maçları ayır ve roundlara göre grupla
    if (this.tournament.matches) {
      Object.entries(this.groups).forEach(([groupName, groupParticipants]) => {
        const ids = groupParticipants.map(p => p.id);
        const groupMatches = this.tournament!.matches!.filter(
          m => ids.includes(m.homeTeamId) && ids.includes(m.awayTeamId)
        );
        this.groupFixtures[groupName] = groupMatches;

        // Roundlara göre grupla ve round numarasına göre sırala
        const groupedByRound: { [round: number]: MatchModel[] } = {};
        groupMatches.forEach(match => {
          if (!groupedByRound[match.round]) groupedByRound[match.round] = [];
          groupedByRound[match.round].push(match);
        });

        const sortedGroupedByRound: { [round: number]: MatchModel[] } = {};
        Object.keys(groupedByRound)
          .map(r => +r)
          .sort((a, b) => a - b)
          .forEach(r => {
            sortedGroupedByRound[r] = groupedByRound[r];
          });
        this.groupedFixtures[groupName] = sortedGroupedByRound;
      });
    }
  }

  getParticipantName(id: number): string {
    if (!this.tournament) return '';
    const p = this.tournament.participants.find(x => x.id === id);
    return p ? p.name : '';
  }

  sortByRound = (a: any, b: any) => +a.key - +b.key;

  onGroupSave(groupKey: string) {
    // Güncel grup participant ve match listesini al
    const groupParticipants = this.groups[groupKey];
    const groupMatches = this.groupFixtures[groupKey];

    // Aktif turnuvayı güncelle
    const tournamentStr = localStorage.getItem('tournament');
    if (tournamentStr) {
      const tournament = JSON.parse(tournamentStr);

      // Katılımcıları güncelle
      if (tournament && tournament.participants) {
        groupParticipants.forEach(updated => {
          const idx = tournament.participants.findIndex((p: any) => p.id === updated.id);
          if (idx > -1) {
            tournament.participants[idx] = { ...updated };
          }
        });
      }

      // Maçları güncelle
      if (tournament && tournament.matches) {
        groupMatches.forEach(updatedMatch => {
          const idx = tournament.matches.findIndex((m: any) => m.id === updatedMatch.id);
          if (idx > -1) {
            tournament.matches[idx].homeScore = updatedMatch.homeScore;
            tournament.matches[idx].awayScore = updatedMatch.awayScore;
          }
        });
      }

      localStorage.setItem('tournament', JSON.stringify(tournament));

      // tournaments dizisinde de güncelle
      const tournamentsStr = localStorage.getItem('tournaments');
      if (tournamentsStr) {
        const tournaments = JSON.parse(tournamentsStr);
        const tIdx = tournaments.findIndex((t: any) => t.id === tournament.id);
        if (tIdx > -1) {
          tournaments[tIdx].participants = tournament.participants;
          tournaments[tIdx].matches = tournament.matches;
          localStorage.setItem('tournaments', JSON.stringify(tournaments));
        }
      }
    }
  }
}
