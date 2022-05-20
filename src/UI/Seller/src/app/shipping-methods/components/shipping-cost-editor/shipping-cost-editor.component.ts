import { Component, Input, Output, EventEmitter } from '@angular/core'
import { ToastrService } from 'ngx-toastr'
import {
  faCalendar,
  faCog,
  faExclamationCircle,
  faQuestionCircle,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { FormGroup, FormBuilder } from '@angular/forms'
import { ShippingMethod, ShippingCost } from '@ordercloud/headstart-sdk'
import { SupportedRates } from '@app-seller/models/currency-geography.types'

@Component({
  selector: 'shipping-cost-editor',
  templateUrl: './shipping-cost-editor.component.html',
  styleUrls: ['./shipping-cost-editor.component.scss'],
})
export class ShippingCostEditor {
  @Input() shippingMethodForm: FormGroup
  @Input()
  set shippingMethod(value: ShippingMethod) {
    if (value) {
      this.isAddingShippingCost = false
      this.isValidNewBreak = false
      this.shippingCostsEditable = JSON.parse(
        JSON.stringify(value?.ShippingCosts)
      ) as ShippingCost[]
      this.newShippingCost = this.getEmptyBreak()
    }
  }

  @Output()
  shippingCostsUpdated = new EventEmitter<ShippingCost[]>()
  shippingCostsEditable: ShippingCost[]
  faCog = faCog
  faTrash = faTrash
  faExclamationCircle = faExclamationCircle
  faCalendar = faCalendar
  faQuestionCircle = faQuestionCircle
  _specCount: number
  _variantCount: number

  isAddingShippingCost = false
  newShippingCost: ShippingCost
  isValidNewBreak = false
  @Input() currency: SupportedRates

  constructor(
    private toasterService: ToastrService,
    private formBuilder: FormBuilder
  ) {}

  getEmptyBreak(): ShippingCost {
    const shippingCosts = this.shippingCostsEditable
    if (shippingCosts.length === 0) {
      this.shippingCostsEditable = [{ OrderTotal: 0, Amount: 0 }]
    }

    return {
      OrderTotal: null,
      Amount: null,
    }
  }

  emitUpdatedMethod(): void {
    this.shippingCostsUpdated.emit(this.shippingCostsEditable)
  }

  updateNewCost(
    event: MouseEvent & { target: HTMLInputElement },
    field: string
  ): void {
    let value: string | number = event.target.value
    if (field === 'OrderTotal') {
      value = parseInt(value, 10)
    }
    this.newShippingCost[field] = value
    const areErrors = this.handleShippingCostErrors(this.shippingCostsEditable)
    this.isValidNewBreak =
      !areErrors &&
      !!this.newShippingCost.OrderTotal &&
      !!this.newShippingCost.Amount
  }

  updateExistingCost(
    event: MouseEvent & { target: HTMLInputElement },
    index: number,
    field: string
  ): void {
    const value = event.target.value
    this.shippingCostsEditable[index][field] = parseFloat(value)
    this.emitUpdatedMethod()
  }

  deleteShippingCost(shippingCost: ShippingCost): void {
    const shippingCosts = this.shippingCostsEditable
    const i = shippingCosts.indexOf(shippingCost)
    shippingCosts.splice(i, 1)
    this.shippingCostsEditable = shippingCosts
    this.emitUpdatedMethod()
  }

  addShippingCost(): void {
    const shippingCosts = this.shippingCostsEditable
    if (this.handleShippingCostErrors(shippingCosts)) return
    const updatedShippingCosts = [...shippingCosts, this.newShippingCost]
    updatedShippingCosts.sort((a, b) => (a.OrderTotal > b.OrderTotal ? 1 : -1))
    this.shippingCostsEditable = updatedShippingCosts
    this.isAddingShippingCost = false
    this.newShippingCost = { OrderTotal: 0, Amount: 0 }
    this.emitUpdatedMethod()
  }

  handleShippingCostErrors(shippingCosts: ShippingCost[]): boolean {
    let hasError = false
    if (
      shippingCosts.some(
        (sc) => sc.OrderTotal === Number(this.newShippingCost.OrderTotal)
      )
    ) {
      this.toasterService.error(
        'A Shipping Cost with that order total already exists'
      )
      hasError = true
    }
    return hasError
  }

  handleUpdateShippingCosts(
    event: MouseEvent & { target: HTMLInputElement },
    field: string
  ): void {
    this.newShippingCost[field] = event.target.value
  }
}
