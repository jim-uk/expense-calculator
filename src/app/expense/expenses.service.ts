import { NumberFormatStyle } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { Expense } from './expense.model';

interface ExpenseData {
  id: string;
  title: string;
  userId: string;
  value: number;
  imageUrl: string;
  dtg: Date;
}

//Main service for handling the expenses
//Function provided:
//  Fetch a single expense
//  add expense
//  get all expenses
//  update an expense
//  upload image of reciept to Google Storage
//  delete expense


@Injectable({
  providedIn: 'root'
})
export class ExpensesService {
  //Main varibale containg our expenses.  We define this as subject, so observables can be raised whenever this changes (ie a new expense is added/deleted)
  //that way, the GUI is automatically updated onChange.
  private _expenses = new BehaviorSubject<Expense[]>([]);

  //function for getting all of our expenses
  //returns observable of our expenses
  get expenses(){
    return this._expenses.asObservable();
  }

  //get a Single Expense
  //Pass in expenseId (GUID generated by Google Firebase Database)
  //Get out object containing our expense
  //returns obseravle for the expense as we need to make an HTTP request for the data, therefore observable is used to handle async request.
  getSingleExpense(expenseId: string){
    console.log("using Expense ID: ", expenseId);
    return this.authService.token.pipe(
      take(1), //only take one instance of the observable rather than a long running one
      switchMap( token => {
        //Switch our obersable with the observable for the http request
        console.log("Fetching: ",expenseId);
        return this.http.get<ExpenseData>(`https://expenses-calculator-275f4-default-rtdb.europe-west1.firebasedatabase.app/expenses/${expenseId}.json?auth=${token}`)
      }),
      map(expenseData => {
        //change the observable to return an expense in our expense dataformt, rather than the object returned from Google.
        console.log(expenseData);
        return new Expense(expenseId, expenseData.title, expenseData.userId, expenseData.value, expenseData.imageUrl, new Date(expenseData.dtg));
      }));
  }

  constructor(private authService: AuthService, private http: HttpClient) { }

  //AddExpense function
  //this function takes in our individual elements and handles the Google interation to upload our new expense, finally it adds it to our expense array.

  addExpense(title: string, value: number, dtg: Date, imageURL: string){
    let generatedId: string;
    let newExpense: Expense;
    let fetchedUserId: string;

    //using SwitchMap to convert 1 observable to another
    //you can't have one observable chain embedded with in another (without a switchmap)
    //eg, userId observable and HTTP request observable
    //so use SwitchMap to convert the observables
    //map apply a function to the strem and retrun the result
    //tap takes the data, applies a function to that data, but returns original data

    //
    return this.authService.userId.pipe(
      take(1),
      switchMap(userId => {
        if (!userId){
          throw new Error('No user id found');
        }
        fetchedUserId=userId;

        return this.authService.token;
      }),
      take(1),
      switchMap(token => {
        newExpense=new Expense(
          Math.random().toString(),
          title,
          fetchedUserId,
          value,
          imageURL,
          dtg
        );

        //push our expense up to Goole Realtime Database
        //push newExpense, but wipe out any value for ID as this is autogenerated by the database.
        return this.http.post<{name: string}>(
          `https://expenses-calculator-275f4-default-rtdb.europe-west1.firebasedatabase.app/expenses.json?auth=${token}`,
          {... newExpense, id: null}
        );
      }),
      switchMap(resData => {
        //store the returned expense guid in a temp variable
        generatedId = resData.name;

        return this.expenses;
      }),
      take(1),
      tap(expenses => {
        //map the new guid into our expense for saving
        newExpense.id=generatedId;

        //raise a new obserable event by addiing new expense to our expense array
        this._expenses.next(expenses.concat(newExpense));

      })
    );


  }

  //Fetch all of our expenses
  //returns observable containing all of our userid


  fetchExpenses(){
    //dynamic notation using back ticks, to allow us to inject a variable
    //orderBy & equalTo is firebase only
    //to be able to search firebase bookings on userId - need to alter database rules to include indexOn clause
    //ref video 212, 03:08

    let fetchedUserId:string;


    return this.authService.userId.pipe(
      take(1),
      switchMap(userId => {
        if (!userId){
          throw new Error("User Not Found");
        }

        fetchedUserId=userId;
        return this.authService.token;
      }),
      take(1),
      switchMap(token => {
        //http request to firebase to pull expenses, filtered by userID, with our authtoken
        //console.log("fetching expenses for userId ", fetchedUserId);
        return this.http.get<{[key: string]: ExpenseData}>(`https://expenses-calculator-275f4-default-rtdb.europe-west1.firebasedatabase.app/expenses.json?orderBy="userId"&equalTo="${fetchedUserId}"&auth=${token}`);
      }),
      map(expenseData => {
        const expenses=[];
        //map the returned elements from firebase into our our expense format
        for (const key in expenseData){
          if (expenseData.hasOwnProperty(key)){
            expenses.push(new Expense(key, expenseData[key].title, expenseData[key].userId, expenseData[key].value, expenseData[key].imageUrl, new Date(expenseData[key].dtg)));
          }
        }
        return expenses;
      }),
      tap(expenses => {
        //emit a new list of bookings
        //raise a new obserable event by addiing new expense to our expense array
        this._expenses.next(expenses);
      })
    );
  }

  //Deletes an expense by expenseId
  //returns an observable when complete.

  deleteExpense(expenseId: string){
    console.log("Deleting ", expenseId);

    //pass request
    return this.authService.token.pipe(
      take(1),
      switchMap(token=> {
        //http request to Firebase to remove the expense, with our expenseId and auth token.
        return this.http.delete(
        `https://expenses-calculator-275f4-default-rtdb.europe-west1.firebasedatabase.app/expenses/${expenseId}.json?auth=${token}`
      )
      }),
      switchMap(() => {
        return this.expenses;
      }),
      take(1),
      tap( expenses => {
        //raise new event on the expense observable, but with our expense ID removed.
        this._expenses.next(expenses.filter(b=> b.id!==expenseId));
      })
    );
  }

  //Uploads image to our function to store in Google Firebase storage.  Returns a URL when we can get our images from.
  //requires our authentication token.
  uploadImage(image: File){
    const uploadData = new FormData();
    uploadData.append('image', image);

    return this.authService.token.pipe(
      take(1),
      switchMap (token => {
        return this.http.post<{imageUrl: string, imagePath: string}>
        (
          'https://us-central1-expenses-calculator-275f4.cloudfunctions.net/storeImage',
           uploadData, {headers: {Authorization: 'Bearer ' + token}}
        );
      })
    )
  }

  //Pass in the parameters we can edit - id, title, value and DTG
  //Function converts this into firebase database format, handles the firebase database interaction
  //and returns a new copy of our expense list.

  updateExpense(expenseId: string, title: string, value: number, dtg: Date){
    //take 1 takes one version of expense, and doesn't subscribe for future updates
    let updatedExpenses: Expense[];
    let fetchedToken: string;
    return this.authService.token.pipe(
      take(1),
      switchMap(token => {
        fetchedToken=token;
        return this.expenses;
      }),
      take(1),
      switchMap(expenses => {

        if (!expenses || expenses.length <=0){
          return this.fetchExpenses();
        }else{
          return of(expenses);
        }
      }),
      switchMap (expenses=>{
        const updatedExpenseIndex = expenses.findIndex( ex=> ex.id === expenseId);
        updatedExpenses = [...expenses];
        const oldExpense = updatedExpenses[updatedExpenseIndex];

        updatedExpenses[updatedExpenseIndex] = new Expense (oldExpense.id, title, oldExpense.userId, value, oldExpense.imageUrl , dtg);

        return this.http.put(
          `https://expenses-calculator-275f4-default-rtdb.europe-west1.firebasedatabase.app/expenses/${expenseId}.json?auth=${fetchedToken}`,
        {
          ...updatedExpenses[updatedExpenseIndex], id: null
        }
        );
      }),
      tap(() => {
        //emit observable containing our revised expense list.
        this._expenses.next(updatedExpenses);
      }));
  }
}