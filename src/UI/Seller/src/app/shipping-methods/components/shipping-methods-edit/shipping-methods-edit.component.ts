import {
  ChangeDetectorRef,
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
} from '@angular/core'
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
import { ListArgs } from '@ordercloud/headstart-sdk'
import {
  ApiClient,
  ApiClients,
  ListPage,
  Meta,
  Product,
  Products,
} from 'ordercloud-javascript-sdk'
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map,
} from 'rxjs/operators'
import { BehaviorSubject, from, Observable, OperatorFunction } from 'rxjs'
import {
  faQuestionCircle,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons'
import { ToastrService } from 'ngx-toastr'

@Component({
  selector: 'app-shipping-methods-edit',
  templateUrl: './shipping-methods-edit.component.html',
  styleUrls: ['./shipping-methods-edit.component.scss'],
})
export class ShippingMethodEditComponent implements OnInit {
  faQuestionCircle = faQuestionCircle
  faTimesCircle = faTimesCircle
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
  @Input()
  set updatedResource(shippingMethod: ShippingMethod) {
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
  @Input() resourceForm: FormGroup
  shippingMethod: ShippingMethod
  availableCurrencies: SupportedRates[] = []
  selectedCurrency: SupportedRates
  includedProductSearchTerm = ''
  products = new BehaviorSubject<Product[]>([])
  productMeta: Meta
  excludedProductSearchTerm = ''
  excludedProducts = new BehaviorSubject<Product[]>([])
  excludedProductMeta: Meta

  constructor(
    public shippingMethodsService: ShippingMethodsService,
    private toastrService: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
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
    void this.listResources().then(() => this.cdr.detectChanges())
    void this.listExcludedResources().then(() => this.cdr.detectChanges())
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
      IncludedProductIDs: new FormControl(shippingMethod.IncludedProductIDs),
      ExcludedProductIDs: new FormControl(shippingMethod.ExcludedProductIDs),
    })
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

  /* Start: Currency control */
  updateSelectedCurrency(currencyCode: string): void {
    this.selectedCurrency = this.availableCurrencies.filter(
      (c) => c.Currency === currencyCode
    )[0]
  }
  /* End: Currency control */

  /* Start: Shipping Costs control */
  updateShippingCosts(event: ShippingCost[]): void {
    this.updateResource.emit({ field: 'ShippingCosts', value: event })
  }
  /* End: Shipping Costs control */

  /* Start: Storefront control */
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
  /* End: Storefront control */

  /* Start: Included products control */
  searchedProducts(searchText: string): void {
    void this.listResources(1, searchText).then(() => this.cdr.detectChanges())
    this.includedProductSearchTerm = searchText
  }

  async listResources(pageNumber = 1, searchText = ''): Promise<void> {
    const options: ListArgs<any> = {
      page: pageNumber,
      search: searchText,
      sortBy: ['Name'],
      pageSize: 25,
      filters: {},
    }
    const resourceResponse = await Products.List(options)
    if (pageNumber === 1) {
      this.setNewResources(resourceResponse)
    } else {
      this.addResources(resourceResponse)
    }
  }

  setNewResources(resourceResponse: ListPage<Product>): void {
    this.productMeta = resourceResponse?.Meta
    this.products.next(resourceResponse?.Items)
  }

  addResources(resourceResponse: ListPage<Product>): void {
    this.products.next([...this.products.value, ...resourceResponse?.Items])
    this.productMeta = resourceResponse?.Meta
  }

  handleScrollEnd(event: any): void {
    // This event check prevents the scroll-end event from firing when dropdown is closed
    // It limits the action within the if block to only fire when you truly hit the scroll-end
    if (event.target.classList.value.includes('active')) {
      const totalPages = this.productMeta?.TotalPages
      const nextPageNumber = this.productMeta?.Page + 1
      if (totalPages >= nextPageNumber) {
        void this.listResources(
          nextPageNumber,
          this.includedProductSearchTerm
        ).then(() => this.cdr.detectChanges())
      }
    }
    this.cdr.detectChanges()
  }

  addSKU(sku: string): void {
    if (this.alreadySelected(sku)) {
      this.toastrService.warning('You have already selected this product')
    } else {
      const newSKUs = [
        ...this.resourceForm.controls['IncludedProductIDs'].value,
        sku,
      ]
      this.updateResource.emit({
        field: 'IncludedProductIDs',
        value: newSKUs,
        form: this.resourceForm,
      })
    }
  }

  removeSku(sku: string): void {
    const modifiedSkus = this.resourceForm.controls[
      'IncludedProductIDs'
    ].value?.filter((s) => s !== sku)
    this.updateResource.emit({
      field: 'IncludedProductIDs',
      value: modifiedSkus,
      form: this.resourceForm,
    })
  }

  alreadySelected(sku: string): boolean {
    return this.shippingMethod.IncludedProductIDs?.includes(sku)
  }
  /* End: Included products control */

  /* Start: Excluded products control */
  searchedExcludedProducts(searchText: string): void {
    void this.listExcludedResources(1, searchText).then(() => this.cdr.detectChanges())
    this.excludedProductSearchTerm = searchText
  }

  async listExcludedResources(pageNumber = 1, searchText = ''): Promise<void> {
    const options: ListArgs<any> = {
      page: pageNumber,
      search: searchText,
      sortBy: ['Name'],
      pageSize: 25,
      filters: {},
    }
    const resourceResponse = await Products.List(options)
    if (pageNumber === 1) {
      this.setNewExcludedResources(resourceResponse)
    } else {
      this.addExcludedResources(resourceResponse)
    }
  }

  setNewExcludedResources(resourceResponse: ListPage<Product>): void {
    this.excludedProductMeta = resourceResponse?.Meta
    this.excludedProducts.next(resourceResponse?.Items)
  }

  addExcludedResources(resourceResponse: ListPage<Product>): void {
    this.excludedProducts.next([
      ...this.excludedProducts.value,
      ...resourceResponse?.Items,
    ])
    this.excludedProductMeta = resourceResponse?.Meta
  }

  handleExcludedScrollEnd(event: any): void {
    // This event check prevents the scroll-end event from firing when dropdown is closed
    // It limits the action within the if block to only fire when you truly hit the scroll-end
    if (event.target.classList.value.includes('active')) {
      const totalPages = this.excludedProductMeta?.TotalPages
      const nextPageNumber = this.excludedProductMeta?.Page + 1
      if (totalPages >= nextPageNumber) {
        void this.listExcludedResources(
          nextPageNumber,
          this.excludedProductSearchTerm
        ).then(() => this.cdr.detectChanges())
      }
    }
    this.cdr.detectChanges()
  }

  addExcludedSKU(sku: string): void {
    if (this.excludedAlreadySelected(sku)) {
      this.toastrService.warning('You have already selected this product')
    } else {
      const newSKUs = [
        ...this.resourceForm.controls['ExcludedProductIDs'].value,
        sku,
      ]
      this.updateResource.emit({
        field: 'ExcludedProductIDs',
        value: newSKUs,
        form: this.resourceForm,
      })
    }
  }

  removeExcludedSku(sku: string): void {
    const modifiedSkus = this.resourceForm.controls[
      'ExcludedProductIDs'
    ].value?.filter((s) => s !== sku)
    this.updateResource.emit({
      field: 'ExcludedProductIDs',
      value: modifiedSkus,
      form: this.resourceForm,
    })
  }

  excludedAlreadySelected(sku: string): boolean {
    return this.shippingMethod.ExcludedProductIDs?.includes(sku)
  }
  /* End: Excluded products control */
}
