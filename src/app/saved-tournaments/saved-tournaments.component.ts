import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-saved-tournaments',
  templateUrl: './saved-tournaments.component.html',
  styleUrls: ['./saved-tournaments.component.css']
})
export class SavedTournamentsComponent implements OnInit {
  tournaments: any[] = [];

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadTournaments();

    // Kendi sekmesinde eklenirse de güncellenmesi için
    window.addEventListener('storage', () => {
      this.loadTournaments();
      this.cdr.detectChanges();
    });

    // Turnuva eklendiğinde diğer componentlerden tetiklenmesi için custom event dinle
    window.addEventListener('tournamentsChanged', () => {
      this.loadTournaments();
      this.cdr.detectChanges();
    });
  }

  loadTournaments() {
    const data = localStorage.getItem('tournaments');
    if (data) {
      this.tournaments = JSON.parse(data);
    } else {
      this.tournaments = [];
    }
    this.cdr.detectChanges();
  }

  showFixture(tournament: any) {
    localStorage.setItem('tournament', JSON.stringify(tournament));
    // Fikstür componentinin tekrar yüklenmesini sağlamak için custom event tetikle
    window.dispatchEvent(new Event('tournamentChanged'));
    this.router.navigate(['/fixture']);
  }

  deleteTournament(id: number, event: Event) {
    event.stopPropagation();
    const idx = this.tournaments.findIndex(t => t.id === id);
    if (idx > -1) {
      const deleted = this.tournaments.splice(idx, 1)[0];
      localStorage.setItem('tournaments', JSON.stringify(this.tournaments));
      // Eğer silinen turnuva aktifse, localStorage'daki 'tournament'ı da temizle
      const active = localStorage.getItem('tournament');
      if (active && deleted && JSON.parse(active).id === deleted.id) {
        localStorage.removeItem('tournament');
        window.dispatchEvent(new Event('tournamentChanged')); // Fixture componentine haber ver
      }
      this.cdr.detectChanges();
    }
  }
}

