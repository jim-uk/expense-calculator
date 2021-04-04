import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from './auth/auth.service';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  private subAuth: Subscription;
  private previousAuthState=false;

  ngOnInit() {
    this.subAuth = this.authService.userIsAuthenticated.subscribe(isAuth =>
      {
        if (!isAuth && this.previousAuthState !== isAuth){
          this.router.navigateByUrl('/auth');
        }
        this.previousAuthState=isAuth;
      }
    )
  }

  ngOnDestroy(){
    if (this.subAuth){
      this.subAuth.unsubscribe();
    }
  }

  constructor(private platform: Platform,
    private authService: AuthService,
    private router: Router) {}

    onLogout() {
      this.authService.logout();

    }
}
