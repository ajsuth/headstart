// core services
import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { ShippingMethodsTableComponent } from './components/shipping-methods-table/shipping-methods-table.component'

const routes: Routes = [
  { path: '', component: ShippingMethodsTableComponent },
  { path: 'new', component: ShippingMethodsTableComponent, pathMatch: 'full' },
  { path: ':shippingMethodID', component: ShippingMethodsTableComponent },
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShippingRoutingModule {}
