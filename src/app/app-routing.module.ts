import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TournamentFormComponent } from './tournament-form/tournament-form.component';
import { FixtureComponent } from './fixture/fixture.component';

const routes: Routes = [
  { path: '', component: TournamentFormComponent },
  { path: 'fixture', component: FixtureComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
