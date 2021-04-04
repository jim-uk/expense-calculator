import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EditPageRoutingModule } from './edit-routing.module';

import { SharedModule } from '../../shared/shared.module';

import { EditPage } from './edit.page';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    EditPageRoutingModule,
    SharedModule
  ],
  declarations: [EditPage]
})
export class EditPageModule {}
