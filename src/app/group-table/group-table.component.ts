import { Component, Input, Output, EventEmitter, ChangeDetectorRef, OnInit } from '@angular/core';
import { ParticipantModel, MatchModel } from '../models/tournament.model';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-group-table',
  templateUrl: './group-table.component.html',
  styleUrls: ['./group-table.component.css'],
  animations: [
    trigger('rowMove', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('300ms cubic-bezier(.35,0,.25,1)', style({ opacity: 1, transform: 'none' }))
      ]),
      transition(':leave', [
        animate('200ms', style({ opacity: 0, transform: 'translateY(20px)' }))
      ]),
      transition('* => *', [
        style({}),
        animate('400ms cubic-bezier(.35,0,.25,1)')
      ])
    ])
  ]
})
export class GroupTableComponent implements OnInit {
  @Input() groupName: string = '';
  @Input() participants: ParticipantModel[] = [];
  @Input() matches: MatchModel[] = [];
  @Output() save = new EventEmitter<void>();

  sortedParticipants: ParticipantModel[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.sortedParticipants = this.getSortedParticipants();
  }

  trackByTeam(index: number, team: ParticipantModel) {
    return team.id;
  }

  saveScores() {
    // İstatistikleri sıfırla
    this.participants.forEach(p => {
      p.goalsFor = 0;
      p.goalsAgainst = 0;
      p.matchesPlayed = 0;
      p.wins = 0;
      p.draws = 0;
      p.losses = 0;
      p.points = 0;
    });

    // Sadece skor girilmiş maçlar için istatistikleri güncelle
    this.matches.forEach(match => {
      if (
        match.homeScore !== null && match.homeScore !== undefined &&
        match.awayScore !== null && match.awayScore !== undefined
      ) {
        const home = this.participants.find(p => p.id === match.homeTeamId);
        const away = this.participants.find(p => p.id === match.awayTeamId);
        if (!home || !away) return;

        home.goalsFor += Number(match.homeScore);
        home.goalsAgainst += Number(match.awayScore);
        home.matchesPlayed += 1;

        away.goalsFor += Number(match.awayScore);
        away.goalsAgainst += Number(match.homeScore);
        away.matchesPlayed += 1;

        if (Number(match.homeScore) > Number(match.awayScore)) {
          home.wins += 1;
          home.points += 3;
          away.losses += 1;
        } else if (Number(match.homeScore) < Number(match.awayScore)) {
          away.wins += 1;
          away.points += 3;
          home.losses += 1;
        } else {
          home.draws += 1;
          away.draws += 1;
          home.points += 1;
          away.points += 1;
        }
      }
    });

    // Sıralamayı uygula
    this.sortedParticipants = this.getSortedParticipants();

    // Satır sırası değişiminde animasyon için detectChanges çağır
    this.cdr.detectChanges();

    this.save.emit();
  }

  getSortedParticipants(): ParticipantModel[] {
    const arr = [...this.participants];
    const averageType = this.getAverageType();

    arr.sort((a, b) => {
      // 1. Puanı fazla olan
      if (b.points !== a.points) return b.points - a.points;

      // 2. Averaj tipi genel ise averajı fazla olan
      if (averageType === 'genel') {
        const aAvg = a.generalAverage;
        const bAvg = b.generalAverage;
        if (bAvg !== aAvg) return bAvg - aAvg;

        // 3. Atılan gol fazla olan
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

        // 4. Yenilen gol az olan
        if (a.goalsAgainst !== b.goalsAgainst) return a.goalsAgainst - b.goalsAgainst;

        // 5. Takım ismi alfabetik
        return a.name.localeCompare(b.name, 'tr');
      }

      // 6. Averaj tipi ikili ise ikili averaj
      if (averageType === 'ikili') {
        const ikiliResult = this.compareIkiliAveraj(a, b);
        if (ikiliResult !== 0) return ikiliResult;

        // 7. Genel averaj kurallarına bakılır
        const aAvg = a.generalAverage;
        const bAvg = b.generalAverage;
        if (bAvg !== aAvg) return bAvg - aAvg;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        if (a.goalsAgainst !== b.goalsAgainst) return a.goalsAgainst - b.goalsAgainst;
        return a.name.localeCompare(b.name, 'tr');
      }

      return 0;
    });

    return arr;
  }

  getAverageType(): 'genel' | 'ikili' {
    // Tahmini: ilk maçtan veya parent'tan alınabilir, yoksa 'genel'
    if (this.matches && this.matches.length > 0 && (window as any).tournament) {
      return (window as any).tournament.averageType || 'genel';
    }
    return 'genel';
  }

  compareIkiliAveraj(a: ParticipantModel, b: ParticipantModel): number {
    // a ve b'nin birbirleriyle oynadığı maçları bul
    const ikiliMatches = this.matches.filter(
      m =>
        (m.homeTeamId === a.id && m.awayTeamId === b.id) ||
        (m.homeTeamId === b.id && m.awayTeamId === a.id)
    );
    let aPoints = 0, bPoints = 0, aAvg = 0, bAvg = 0, aGoals = 0, bGoals = 0, aAgainst = 0, bAgainst = 0;

    ikiliMatches.forEach(m => {
      if (m.homeScore === null || m.homeScore === undefined || m.awayScore === null || m.awayScore === undefined) return;
      let aScore = m.homeTeamId === a.id ? m.homeScore : m.awayScore;
      let bScore = m.homeTeamId === b.id ? m.homeScore : m.awayScore;
      let aScoreAgainst = m.homeTeamId === a.id ? m.awayScore : m.homeScore;
      let bScoreAgainst = m.homeTeamId === b.id ? m.awayScore : m.homeScore;

      aGoals += Number(aScore);
      bGoals += Number(bScore);
      aAgainst += Number(aScoreAgainst);
      bAgainst += Number(bScoreAgainst);
      aAvg += Number(aScore) - Number(aScoreAgainst);
      bAvg += Number(bScore) - Number(bScoreAgainst);

      if (aScore > bScore) aPoints += 3;
      else if (aScore < bScore) bPoints += 3;
      else {
        aPoints += 1;
        bPoints += 1;
      }
    });

    // 6. En çok puanı alan
    if (bPoints !== aPoints) return bPoints - aPoints;
    // 7. Genel averaj kurallarına bakılır
    if (bAvg !== aAvg) return bAvg - aAvg;
    if (bGoals !== aGoals) return bGoals - aGoals;
    if (aAgainst !== bAgainst) return aAgainst - bAgainst;
    return a.name.localeCompare(b.name, 'tr');
  }
}
