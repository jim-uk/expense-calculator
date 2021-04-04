import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, from } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { User } from './user.model';
import { Plugins } from '@capacitor/core'

/*

The Auth Module was adapted from the UDEMY Course Project for use within this expense calculator


Although not strictly required by the mark scheme, Google Firebase has now made it that you cannot have an 'open' firebase database for anything more than 30 days.
Because I don't know when this will be 'viewed', to allow access to the firebase database, we need to have 'authenticated' users when interacting with Firebase
Therefore, we need to have some mechanism to handle authentication of users.

Authentication token is also used to provide authenticated access to storage module - we don't to leave our storage bucket open to the world!

This module has been modified from the Udemy Course project for use within the expense calculator.


*/


export interface AuthResponseData{
  idToken: string,
  email: string,
  refreshToken: string,
  expiresIn : string,
  localId: string,
  registered?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private _user = new BehaviorSubject<User>(null);
  private activeLogoutTimer: any;

  //function to return if the user is Authenticated or not
  //returns observable to a boolean
  get userIsAuthenticated() {
    //using map to change the observable to only just return the user token and not a user object.

    return this._user.asObservable().pipe(
      map (user => {
        if (user){
          return !!user.token
        }
        return false;
      }
    ));
  }


  //function to return userID (guid) of current user.  GUID is generated through Google Authentication
  //returns observable containing the userId
  get userId() {
    //using map to change the observable to only just return the user token and not a user object.

    return this._user.asObservable().pipe(map(user => {

      if (user){
        return user.id
      }
      return null;

    }
    ));
  }

  //Auth Service constructor - pass in HTTP client for use in this class.
  constructor(private http: HttpClient) {}


  //When the auth service is destroyed, remove our logout timer
  ngOnDestroy() {
    if (this.activeLogoutTimer){
      clearTimeout(this.activeLogoutTimer);
    }
  }


  //Perform autoLog out when the expiresIs value is reached.  Typical Google Authenticated expiresIn is 60 mins
  autoLogout(duration: number){
    if (this.activeLogoutTimer){
      clearTimeout(this.activeLogoutTimer);
    }
    this.activeLogoutTimer=setTimeout(()=>{
      this.logout();
    }, duration)
  }

  //perform an automatic login if:
  //We have already logged in previous, and have cache login credentias
  //if time < expires in
  //set the user object with the cached credentials
  //returns an obseravable

  autoLogin() {
    //storage get returns a promise
    //use from Operator to convert to an observable

    return from(Plugins.Storage.get({key: 'authData'})).pipe(
      map(storedData => {
        //console.log("got stored data ", storedData);

        if (!storedData || !storedData.value){
          return null;
        }
        const parsedData = JSON.parse(storedData.value) as { token: string, tokenExpirationDate: string, userId: string, email: string}

        //console.log("ParsedData ", parsedData);

        const expirationTime = new Date(parsedData.tokenExpirationDate);

        if (expirationTime <= new Date()){
          return null;
        }

        const user=new User(parsedData.userId, parsedData.email, parsedData.token, expirationTime);

        return user;
      }),
      tap(user => {
        if (user){
          this._user.next(user);
          this.autoLogout(user.tokenDuration);
        }
      }),
      map(user => {
        return !!user;
      })
    );
  }

  //function to perform login interaction with Google Authentication
  //retuns an obserable containting the result of this function
  login(email: string, password: string) {
    return this.http.post<AuthResponseData>(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=
      ${environment.firebaseAPIKey}`, {email: email, password: password, returnSecureToken: true }
    ).pipe(tap(this.setUserData.bind(this)));
  }

  //performs logout by clearing the local cache and clearing the autologout timer.
  logout() {
    if (this.activeLogoutTimer){
      clearTimeout(this.activeLogoutTimer);
    }

    this._user.next(null);

    Plugins.Storage.remove({key: 'authData'});
  }

  //function to perform singup interaction with Google Authentication
  //retuns an obserable containting the result of this function
  signup(email: string, password: string){
    return this.http.post<AuthResponseData>(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=
      ${environment.firebaseAPIKey}`, {email: email, password: password, returnSecureToken: true }
    ).pipe(tap(this.setUserData.bind(this)));
  }



  //prepates the users credentials for the local storage cache
  private setUserData(userData: AuthResponseData){
     //use + to convert from string to number

      const expirationTime = new Date(new Date().getTime() + (+userData.expiresIn * 1000));
      const user = new User(userData.localId, userData.email, userData.idToken, expirationTime);
      this._user.next(user);

      this.autoLogout(user.tokenDuration);

      this.storeAuthData(userData.localId, userData.idToken, expirationTime.toISOString(), userData.email);
  }

  //sets the users credentials for the local storage cache
  private storeAuthData(userId: string, token: string, tokenExpirationDate: string, email: string){
    const data = JSON.stringify(
      {userId: userId, token: token, tokenExpirationDate: tokenExpirationDate, email: email }
    );

    Plugins.Storage.set({key: 'authData', value: data})
  }


  //gets the user login token
  //returns an observable containing the token
  get token(){
    //using map to change the observable to only just return the user token and not a user object.
    //auth token is used to authenticate ourselves with all firebase interaction
    //Firebase has recently changed to not allow 'open' databases for anything more than 30 days.
    return this._user.asObservable().pipe(map(user => {

      if (user){
        return user.token;
      }
      return null;

    }
    ));
  }
}
