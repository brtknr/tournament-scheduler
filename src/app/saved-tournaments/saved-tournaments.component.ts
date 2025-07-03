import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-saved-tournaments',
  templateUrl: './saved-tournaments.component.html',
  styleUrls: ['./saved-tournaments.component.css']
})
export class SavedTournamentsComponent implements OnInit {
  tournaments: any[] = [];
  selectedTournamentId: number | null = null;

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadTournaments();
    this.setSelectedTournamentFromStorage();

    // Kendi sekmesinde eklenirse de güncellenmesi için
    window.addEventListener('storage', () => {
      this.loadTournaments();
      this.setSelectedTournamentFromStorage();
    });

    // Turnuva eklendiğinde diğer componentlerden tetiklenmesi için custom event dinle
    window.addEventListener('tournamentsChanged', () => {
      this.loadTournaments();
      this.cdr.detectChanges();
    });

    // Route değişimini dinle, eğer fixture dışında bir sayfadaysa seçimi kaldır
    this.router.events.subscribe(event => {
      // NavigationEnd import edilmeli: import { NavigationEnd } from '@angular/router';
      if (event.constructor.name === 'NavigationEnd') {
        if (!this.router.url.includes('/fixture')) {
          this.selectedTournamentId = null;
          this.cdr.detectChanges();
        }
      }
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

  showFixture(t: any) {
    this.selectedTournamentId = t.id;
    localStorage.setItem('tournament', JSON.stringify(t));
    // Fikstür componentinin tekrar yüklenmesini sağlamak için custom event tetikle
    window.dispatchEvent(new Event('tournamentChanged'));
    this.router.navigate(['/fixture']);
  }

  setSelectedTournamentFromStorage() {
    const data = localStorage.getItem('tournament');
    if (data) {
      try {
        const t = JSON.parse(data);
        this.selectedTournamentId = t?.id ?? null;
      } catch {
        this.selectedTournamentId = null;
      }
    } else {
      this.selectedTournamentId = null;
    }
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

