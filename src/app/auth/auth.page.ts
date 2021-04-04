import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { AuthService, AuthResponseData } from './auth.service';



@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss']
})
export class AuthPage implements OnInit {
  isLoading = false;
  isLogin = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}


  ngOnInit() {}

  authenticate(email: string, password: string) {
    this.isLoading = true;
    this.loadingCtrl
      .create({ keyboardClose: true, message: 'Logging in...' })
      .then(loadingEl => {
        loadingEl.present();

        let obsAuth: Observable<AuthResponseData>;

        if (this.isLogin){
          obsAuth=this.authService.login(email,password);
        }else{
          obsAuth=this.authService.signup(email,password);
        }

        obsAuth.subscribe(
          resData => {
            //console.log(resData);

            this.isLoading = false;
            loadingEl.dismiss();
            this.router.navigateByUrl('/expense');
          }, errRes => {
            loadingEl.dismiss();

            console.log(errRes);

            const code= errRes.error.error.message;

            let message= 'Error occured on Signup, please try again.'
            if (code === 'EMAIL_EXISTS'){
              message="This Email Address already exists";
            }else if (code === 'EMAIL_NOT_FOUND'){
              message = "Email Address could not be found";
            }else if (code ==='INVALID_PASSWORD'){
              message = "Invalid Password";
            }

            this.showAlert(message);

          }
        );
      });
  }

  onSwitchAuthMode() {
    this.isLogin = !this.isLogin;
  }

  onSubmit(form: NgForm) {
    if (!form.valid) {
      return;
    }
    const email = form.value.email;
    const password = form.value.password;
    //console.log(email, password);

    this.authenticate(email, password);

    form.reset();
  }

  private showAlert(message: string){
    this.alertCtrl.create (
      {
        header: 'Authentication Failed',
        message: message,
        buttons: ['Ok']
      }
    ).then(alertEl => {
      alertEl.present();
    });
  }
}
