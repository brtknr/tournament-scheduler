import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { RouterModule } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TournamentFormComponent } from './tournament-form/tournament-form.component';
import { FormsModule } from '@angular/forms';
import { FixtureComponent } from './fixture/fixture.component';
import { SavedTournamentsComponent } from './saved-tournaments/saved-tournaments.component';
import { GroupTableComponent } from './group-table/group-table.component';

@NgModule({
  declarations: [
    AppComponent,
    TournamentFormComponent,
    FixtureComponent,
    SavedTournamentsComponent,
    GroupTableComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot(),
    RouterModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
