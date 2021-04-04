import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonItemSliding, LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Expense } from './expense.model';
import { ExpensesService } from './expenses.service';

@Component({
  selector: 'app-expense',
  templateUrl: './expense.page.html',
  styleUrls: ['./expense.page.scss'],
})
export class ExpensePage implements OnInit, OnDestroy {
  expenses: Expense[];

  private subExpenses: Subscription;
  isLoading =true;
  totalCost;

  constructor(private expenseService: ExpensesService, private router: Router, private loadingCtrl: LoadingController) { }


  //ngOnInit - triggered when the page is first rendered.  updates and revisits do not trigger this
  ngOnInit() {
    //Subscribe to our expenses observable

    //this sets up an ongoing subscription to expenses, but doesn't load it with any values at the start
    //as this will be a long running subscription, we need to unsubscribe when we're complete
    this.subExpenses=this.expenseService.expenses.subscribe(expenses => {
      //Something has changed our list of expenses (add/delete/update)
      this.expenses=expenses;

      //recalculate the total.
      this.caclTotal();
    });
  }

  //ionViewWillEnter - triggered when the view is displayed
  ionViewWillEnter(){
    this.isLoading=true;

    //initiate a fetch request to get the complete list, then deal with the results when complete
    //this is a once only subscription, once we're complete, it cleansup
    this.expenseService.fetchExpenses().subscribe(()=>{
      this.isLoading=false;

      //calculate the total after intial load.
      this.caclTotal();
    } );
  }

  //recalculate the total.
  caclTotal(){
    this.totalCost=0;
    this.expenses.forEach(thisExpense => {
      //cycle through each of the expenses and add it to our total
      this.totalCost=this.totalCost + thisExpense.value;
    });
  }


  //out form is be closed, to clean up our subscription request to prevent mememory leak
  ngOnDestroy(){
    if (this.subExpenses){
      this.subExpenses.unsubscribe();
    }
  }

  //function to delete an expense by the passed expense GUID
  tsDeleteExpense(expenseId: string, slidingEl: IonItemSliding) {
    console.log("Deleting",expenseId);
    slidingEl.close();


    //create a loading control to display to the used until our request is complete.
    this.loadingCtrl.create({
      message: "Deleting...."
    }).then(loadingEl =>{
      loadingEl.present();
      this.expenseService.deleteExpense(expenseId).subscribe(()=>{
        //once the request is completed, dismiss the dialogue
        loadingEl.dismiss();
      });
    });
  }
}
