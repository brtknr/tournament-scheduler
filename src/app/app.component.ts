import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'tournament-scheduler';
  tournaments: any[] = [];
  showSidenav = false;

  ngOnInit() {
    // Çoklu turnuva desteği için localStorage'da "tournaments" dizisi kullanılır
    const data = localStorage.getItem('tournaments');
    if (data) {
      this.tournaments = JSON.parse(data);
    } else {
      // Tek bir "tournament" kaydı varsa onu da göster
      const single = localStorage.getItem('tournament');
      if (single) {
        const t = JSON.parse(single);
        this.tournaments = [t];
      }
    }
  }
}
