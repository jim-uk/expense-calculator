import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Expense } from '../expense.model';
import { ExpensesService } from '../expenses.service';

@Component({
  selector: 'app-edit',
  templateUrl: './edit.page.html',
  styleUrls: ['./edit.page.scss'],
})
export class EditPage implements OnInit {
  expense: Expense;
  form: FormGroup;
  private subExpense: Subscription;
  isLoading=false;
  expenseId: string;
  selectedImage: string;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private router: Router,
    private loadingCtrl: LoadingController,
    private expenseService: ExpensesService,
    private alertCtrl: AlertController) { }

    ngOnInit() {
      this.route.paramMap.subscribe(paramMap => {
        //check to see if we've been passed an expenseID, if not, return back to main expense page.

        if (!paramMap.has('expenseId')) {
          this.navCtrl.navigateBack('/expense');
          return;
        }

        //store our expense ID
        this.expenseId= paramMap.get('expenseId');


        //set the HTML to display our loading page
        this.isLoading=true;
        this.subExpense = this.expenseService
          //get our single expense as an asymetric request, and map the result to the form.
          .getSingleExpense(paramMap.get('expenseId'))
          .subscribe(expense => {
            this.expense =expense;
            //got our expense, now map the result onto our reactive form.
            this.form = new FormGroup({
              title: new FormControl(this.expense.title, {
                updateOn: 'blur',
                validators: [Validators.required, Validators.maxLength(180)]
              }),
              value: new FormControl(this.expense.value, {
                updateOn: 'blur',
                validators: [Validators.required, Validators.maxLength(180)]
              }),
              dtg: new FormControl(this.expense.dtg.toISOString(), {
                updateOn: 'blur',
                validators: [Validators.required]
              })
            });

            //revert the HTML to our loaded state - ie display our expense, rather than a spinner
            this.isLoading=false;

            //update the image object with the correct firebase storage URL
            this.selectedImage=this.expense.imageUrl;

          }, error=>{
            //Some error has occured - so log the error and display a friendly result to the user.
            console.log(error);
            this.alertCtrl.create({
              header: 'An Error Occurred!',
              message: 'Expense could not be fetched, please try again later.',
              buttons: [{text: 'Ok', handler: () => {
                this.router.navigate(['/expense']);
              }}]
            }).then (alertEl => {
             alertEl.present();
            });
          });
      });
    }

    onUpdateExpense() {
      //check the form is valid - if not, do not proceed.
      if (!this.form.valid) {
        return;
      }

      //one time subscripton, cleared when done.
      //create a loading dialouge to cover for the pause when interactiving with firebase
      this.loadingCtrl.create({
        message: 'Updating Place....'
      }).then (loadingEl => {
        loadingEl.present();

        //pass our updated expense to the expense service
        this.expenseService.updateExpense(this.expense.id,
          this.form.value.title,
          this.form.value.value,
          this.form.value.dtg
          ).subscribe(()=>{
            //wait for updateExpense to complete
            //once it has, dismiss the dialouge and navigate back to the main screen.
            loadingEl.dismiss();

            this.form.reset();
            this.router.navigate (['/expense']);
          });

      })
    }

    //clean up - once this form has been completed, remove our subscription.
    ngOnDestroy() {
      if (this.subExpense) {
        this.subExpense.unsubscribe();
      }
    }

  }
