/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ChangeDetectorRef,
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
} from '@angular/core'
import { FormGroup } from '@angular/forms'
import { Meta, ListPage, Product, Products } from 'ordercloud-javascript-sdk'
import { ListArgs } from '@ordercloud/headstart-sdk'
import { BehaviorSubject } from 'rxjs'
import {
  faQuestionCircle,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons'
import { ToastrService } from 'ngx-toastr'

@Component({
  selector: 'app-shipping-products-edit',
  templateUrl: './shipping-products-edit.component.html',
})
export class ShippingProductsEditComponent {
  faQuestionCircle = faQuestionCircle
  faTimesCircle = faTimesCircle
  @Input() title: string
  @Input() tooltip: string
  @Input() field: string
  @Input() resourceForm: FormGroup
  @Output()
  updateResource = new EventEmitter<any>()
  productSearchTerm = ''
  products = new BehaviorSubject<Product[]>([])
  productMeta: Meta

  constructor(
    private toastrService: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}
  searchedProducts(searchText: string): void {
    void this.listResources(1, searchText).then(() => this.cdr.detectChanges())
    this.productSearchTerm = searchText
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
        void this.listResources(nextPageNumber, this.productSearchTerm)
          .then()
          .then(() => this.cdr.detectChanges())
      }
    }
    this.cdr.detectChanges()
  }

  addSKU(sku: string): void {
    if (this.alreadySelected(sku)) {
      this.toastrService.warning('You have already selected this product')
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const newSKUs = [...this.resourceForm.controls[this.field].value, sku]
      this.updateResource.emit({
        field: 'IncludedProductIDs',
        value: newSKUs,
        form: this.resourceForm,
      })
    }
  }

  removeSku(sku: string): void {
    const modifiedSkus = this.resourceForm.controls[this.field].value?.filter(
      (s: string) => s !== sku
    )
    this.updateResource.emit({
      field: this.field,
      value: modifiedSkus,
      form: this.resourceForm,
    })
  }

  alreadySelected(sku: string): boolean {
    return false
    //return this.shippingMethod[this.field]?.includes(sku)
  }
}
