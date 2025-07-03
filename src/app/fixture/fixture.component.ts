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

  exportCSV() {
    if (!this.tournament) return;
    let csv = '';

    // Her grup için tablo ve fikstür
    Object.entries(this.groups).forEach(([groupName, groupParticipants]) => {
      // Grup başlığı
      csv += `"${groupName} - Puan Tablosu"\r\n`;
      // Tablo başlıkları
      csv += 'Sıra,Takım,O,G,B,M,A,Y,AV,P\r\n';
      // Sıralı katılımcılar
      const sorted = [...groupParticipants].sort((a, b) => b.points - a.points || b.generalAverage - a.generalAverage);
      sorted.forEach((team, i) => {
        csv += `${i + 1},"${team.name}",${team.matchesPlayed},${team.wins},${team.draws},${team.losses},${team.goalsFor},${team.goalsAgainst},${team.generalAverage},${team.points}\r\n`;
      });
      csv += '\r\n';
      // Fikstür başlığı
      csv += `"${groupName} - Fikstür"\r\n`;
      csv += 'Hafta,Ev Takımı,Deplasman Takımı,Ev Skor,Deplasman Skor\r\n';
      const groupFixtures = this.groupedFixtures[groupName] as { [key: string]: MatchModel[] };
      Object.keys(groupFixtures)
        .sort((a, b) => +a - +b)
        .forEach((roundKey: string) => {
          (groupFixtures[roundKey] as MatchModel[]).forEach((match: MatchModel) => {
            csv += `${roundKey},"${this.getParticipantName(match.homeTeamId)}","${this.getParticipantName(match.awayTeamId)}",${match.homeScore ?? ''},${match.awayScore ?? ''}\r\n`;
          });
        });
      csv += '\r\n\r\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (this.tournament.tournamentName || 'fikstur') + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  exportExcel() {
    if (!this.tournament) return;
    let html = `<html><head><meta charset="UTF-8"></head><body>`;

    Object.entries(this.groups).forEach(([groupName, groupParticipants]) => {
      // Grup Tablosu
      html += `<h3>${groupName} - Puan Tablosu</h3>`;
      html += `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;">`;
      html += `<tr><th>Sıra</th><th>Takım</th><th>O</th><th>G</th><th>B</th><th>M</th><th>A</th><th>Y</th><th>AV</th><th>P</th></tr>`;
      const sorted = [...groupParticipants].sort((a, b) => b.points - a.points || b.generalAverage - a.generalAverage);
      sorted.forEach((team, i) => {
        html += `<tr>
          <td>${i + 1}</td>
          <td>${team.name}</td>
          <td>${team.matchesPlayed}</td>
          <td>${team.wins}</td>
          <td>${team.draws}</td>
          <td>${team.losses}</td>
          <td>${team.goalsFor}</td>
          <td>${team.goalsAgainst}</td>
          <td>${team.generalAverage}</td>
          <td>${team.points}</td>
        </tr>`;
      });
      html += `</table><br/>`;

      // Fikstür
      html += `<h3>${groupName} - Fikstür</h3>`;
      html += `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;">`;
      html += `<tr><th>Hafta</th><th>Ev Takımı</th><th>Deplasman Takımı</th><th>Ev Skor</th><th>Deplasman Skor</th></tr>`;
      const groupFixtures = this.groupedFixtures[groupName] as { [key: string]: MatchModel[] };
      Object.keys(groupFixtures)
        .sort((a, b) => +a - +b)
        .forEach((roundKey: string) => {
          (groupFixtures[roundKey] as MatchModel[]).forEach((match: MatchModel) => {
            html += `<tr>
              <td>${roundKey}</td>
              <td>${this.getParticipantName(match.homeTeamId)}</td>
              <td>${this.getParticipantName(match.awayTeamId)}</td>
              <td>${match.homeScore ?? ''}</td>
              <td>${match.awayScore ?? ''}</td>
            </tr>`;
          });
        });
      html += `</table><br/><br/>`;
    });

    html += `</body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (this.tournament.tournamentName || 'fikstur') + '.xls';
    a.click();
    URL.revokeObjectURL(url);
  }
}
