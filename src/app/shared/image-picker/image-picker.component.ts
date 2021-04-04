import {Component,OnInit, Output, EventEmitter, ViewChild, ElementRef, Input } from '@angular/core';
import {Plugins, Capacitor, CameraSource,   CameraResultType } from '@capacitor/core';
import { Platform } from '@ionic/angular';

//this is a component for handing photo capture
//We don't use this anywhere else apart from the new expense page, so doesn't really need to be a component, but it's just easier with a large file to eep it all self-contained

@Component({
  selector: 'app-image-picker',
  templateUrl: './image-picker.component.html',
  styleUrls: ['./image-picker.component.scss'],
})
export class ImagePickerComponent implements OnInit {
  @ViewChild('filePicker', { static: false }) filePickerRef: ElementRef<HTMLInputElement>;
  @Output() imagePick = new EventEmitter<string | File>();
  @Input() showPreview=false;

  selectedImage: string;
  usePicker = false;

  constructor(private platform: Platform) {}

  //see if we're running on a mobile (or progressive web app) or on a desktop (without PWA extentsions)
  //if we are mobile/progressive then we can use the photo picker, otherwise we'll use a plain HTML INPUT FILE to allow an image to be uploaded.

  ngOnInit() {
    if (
      (this.platform.is('mobile') && !this.platform.is('hybrid')) ||
      this.platform.is('desktop')
    ) {
      this.usePicker = true;
    }
  }

  //check to see if photo capture is available, if so, setup a photo capture observable, the result is then stored on an HTML image.
  //returns the image as a base64 encoded string, which we can use directly on an HTML IMG SRC element (if we use the correct DATA: identifier)
  onPickImage() {
    if (!Capacitor.isPluginAvailable('Camera')) {
      this.filePickerRef.nativeElement.click();
      return;
    }
    Plugins.Camera.getPhoto({
      quality: 50,
      source: CameraSource.Prompt,
      correctOrientation: true,
      height: 320,
      width: 200,
      resultType: CameraResultType.Base64
    })
      .then(image => {
        this.selectedImage = "data:image/jpeg;base64, " + image.base64String;
        this.imagePick.emit(image.base64String);
      })
      .catch(error => {
        console.log(error);
        if (this.usePicker) {
          this.filePickerRef.nativeElement.click();
        }
        return false;
      });
  }

  //if we're using a convential HTML INPUT FILE element, use filereader to read the file and store the binary. (binary used for upload)
  onFileChosen(event: Event) {
    const pickedFile = (event.target as HTMLInputElement).files[0];
    if (!pickedFile) {
      return;
    }
    const fr = new FileReader();
    fr.onload = () => {
      const dataUrl = fr.result.toString();
      this.selectedImage = dataUrl;
      this.imagePick.emit(pickedFile);
    };
    fr.readAsDataURL(pickedFile);
  }
}

