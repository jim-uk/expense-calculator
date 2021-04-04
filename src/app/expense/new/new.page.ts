import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { switchMap } from 'rxjs/operators';
import { ExpensesService } from '../expenses.service';


//Convert our base64 encoded string back to binary data.
function base64toBlob(base64Data, contentType) {
  contentType = contentType || '';
  const sliceSize = 1024;
  const byteCharacters = window.atob(base64Data);
  const bytesLength = byteCharacters.length;
  const slicesCount = Math.ceil(bytesLength / sliceSize);
  const byteArrays = new Array(slicesCount);

  for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
    const begin = sliceIndex * sliceSize;
    const end = Math.min(begin + sliceSize, bytesLength);

    const bytes = new Array(end - begin);
    for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
      bytes[i] = byteCharacters[offset].charCodeAt(0);
    }
    byteArrays[sliceIndex] = new Uint8Array(bytes);
  }
  return new Blob(byteArrays, { type: contentType });
}

@Component({
  selector: 'app-new',
  templateUrl: './new.page.html',
  styleUrls: ['./new.page.scss'],
})
export class NewPage implements OnInit {
  form: FormGroup;
  constructor(private expensesService: ExpensesService,
    private router: Router,
    private loadingCtrl: LoadingController) { }

  //set up our form mappings
  ngOnInit() {
    this.form = new FormGroup({
      title: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(180)]
      }),
      value: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      dtg: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),

      image: new FormControl(null)

    });
  }

  //when our image has been picked, set the image value to a binary encoded string or if it's binary pass through, also sets the image to a base64 encoded string.

  onImagePicked(imageData: string | File) {
    let imageFile;
    if (typeof imageData === 'string') {
      try {
        imageFile = base64toBlob(
          imageData.replace('data:image/jpeg;base64,', ''),
          'image/jpeg'
        );
      } catch (error) {
        console.log(error);
        return;
      }
    } else {
      imageFile = imageData;
    }
    this.form.patchValue({ image: imageFile });
  }

  onCreateExpense() {
    console.log(this.form.value);

    //check to make sure the form is valid
    if ((!this.form.valid) || (!this.form.get('image').value)) {
      return;
    }

    //display a loadingctrl while we deal with the asym request to firebase to upload the new expense.
    this.loadingCtrl
      .create({
        message: 'Creating Expense...'
      })
      .then(loadingEl => {
        loadingEl.present();
        //upload our image
        this.expensesService.uploadImage(this.form.get('image').value)
        .pipe(
          switchMap(uploadRes => {
            //pass our new expense to addExpense funtion in the expense service to post our new expense.  pass in the new url for the image, as hosted on firebase storage

            return this.expensesService.addExpense(
            this.form.value.title,
            +this.form.value.value,
            new Date(this.form.value.dtg),
            uploadRes.imageUrl)
          }
        ))
        .subscribe(() => {
            //once it's all complete, clear our loading dialogue, and navigate back to the main expense page.

            loadingEl.dismiss();
            this.form.reset();
            this.router.navigate(['/expense']);
          });
      });
  }
}
