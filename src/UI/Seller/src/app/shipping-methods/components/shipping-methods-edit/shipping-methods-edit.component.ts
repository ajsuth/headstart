import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core'
import { FormGroup, FormControl, Validators } from '@angular/forms'
import { ShippingMethodsService } from '@app-seller/shipping-methods/shipping-methods.service'
import {
  ShippingMethod,
  ShippingCost,
  HeadStartSDK,
} from '@ordercloud/headstart-sdk'
import {
  SupportedCurrencies,
  SupportedRates,
} from '@app-seller/models/currency-geography.types'
import { ApiClient, ApiClients } from 'ordercloud-javascript-sdk'
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map,
} from 'rxjs/operators'
import { from, Observable, OperatorFunction } from 'rxjs'
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons'

@Component({
  selector: 'app-shipping-methods-edit',
  templateUrl: './shipping-methods-edit.component.html',
  styleUrls: ['./shipping-methods-edit.component.scss'],
})
export class ShippingMethodEditComponent implements OnInit {
  faQuestionCircle = faQuestionCircle
  @Input()
  filterConfig
  @Input()
  set resourceInSelection(shippingMethod: ShippingMethod) {
    if (shippingMethod.id) {
      this.createShippingMethodForm(shippingMethod)
      this.shippingMethod = JSON.parse(
        JSON.stringify(shippingMethod)
      ) as ShippingMethod
      this.updateSelectedCurrency(shippingMethod.Currency)
    } else {
      this.createShippingMethodForm(this.shippingMethodsService.emptyResource)
      this.shippingMethod = JSON.parse(
        JSON.stringify(this.shippingMethodsService.emptyResource)
      ) as ShippingMethod
      this.updateSelectedCurrency(
        this.shippingMethodsService.emptyResource.Currency
      )
    }
  }
  @Output()
  updateResource = new EventEmitter<any>()
  @Output()
  updateList = new EventEmitter<ShippingMethod>()
  @Output()
  isCreatingNew: boolean
  resourceForm: FormGroup
  shippingMethod: ShippingMethod
  availableCurrencies: SupportedRates[] = []
  selectedCurrency: SupportedRates

  constructor(public shippingMethodsService: ShippingMethodsService) {
    this.isCreatingNew = this.shippingMethodsService.checkIfCreatingNew()
  }

  async ngOnInit(): Promise<void> {
    this.availableCurrencies = (
      await HeadStartSDK.ExchangeRates.GetRateList()
    ).Items
    this.availableCurrencies = this.availableCurrencies.filter((c) =>
      Object.values(SupportedCurrencies).includes(
        SupportedCurrencies[c.Currency]
      )
    )
  }

  createShippingMethodForm(shippingMethod: ShippingMethod): void {
    this.resourceForm = new FormGroup({
      ID: new FormControl(shippingMethod.id, Validators.required),
      Name: new FormControl(shippingMethod.Name, Validators.required),
      Description: new FormControl(shippingMethod.Description),
      Active: new FormControl(shippingMethod.Active),
      Currency: new FormControl(shippingMethod.Currency),
      EstimatedTransitDays: new FormControl(
        shippingMethod.EstimatedTransitDays
      ),
      Storefront: new FormControl(shippingMethod.Storefront),
    })
  }

  updateSelectedCurrency(currencyCode: string): void {
    this.selectedCurrency = this.availableCurrencies.filter(
      (c) => c.Currency === currencyCode
    )[0]
  }

  updateResourceFromEvent(event: Event, field: string): void {
    const input = event.target as HTMLInputElement
    field === 'Active'
      ? this.updateResource.emit({
        value: input.checked,
        field,
        form: this.resourceForm,
      })
      : this.updateResource.emit({
        value: input.value,
        field,
        form: this.resourceForm,
      })
    if (field === 'Currency') {
      this.updateSelectedCurrency(input.value)
    }
  }

  updateShippingCosts(event: ShippingCost[]): void {
    this.updateResource.emit({ field: 'ShippingCosts', value: event })
  }

  searchApiClients: OperatorFunction<string, readonly ApiClient[]> = (
    text$: Observable<string>
  ): Observable<ApiClient[]> => {
    return text$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => {
        return from(ApiClients.List({ search: term, pageSize: 10 })).pipe(
          map((listResponse) => {
            return listResponse.Items.filter((client) => client.xp.IsStorefront)
          })
        )
      })
    )
  }

  appName = (apiClient: ApiClient): string => {
    if (typeof apiClient === 'string') {
      return apiClient
    } else {
      return apiClient.AppName
    }
  }

  selectApiClient(event: {
    item: ApiClient
    preventDefault: () => void
  }): void {
    event.preventDefault() // default behavior saves entire buyer object to model, we just want to set the ID
    this.resourceForm.controls['Storefront'].setValue(event.item.ID)
  }
}
