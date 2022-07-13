import { NgModule } from '@angular/core'
import { SharedModule } from '@app-seller/shared'
import {
  NgbTooltipModule,
  NgbTypeaheadModule,
} from '@ng-bootstrap/ng-bootstrap'
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar'
import { ShippingRoutingModule } from './shipping-methods-routing.module'
import { ShippingMethodsTableComponent } from './components/shipping-methods-table/shipping-methods-table.component'
import { ShippingMethodEditComponent } from './components/shipping-methods-edit/shipping-methods-edit.component'
import { ShippingCostEditor } from './components/shipping-cost-editor/shipping-cost-editor.component'

@NgModule({
  declarations: [
    ShippingMethodsTableComponent,
    ShippingMethodEditComponent,
    ShippingCostEditor,
  ],
  imports: [
    SharedModule,
    ShippingRoutingModule,
    PerfectScrollbarModule,
    NgbTooltipModule,
    NgbTypeaheadModule,
  ],
})
export class ShippingModule {}
