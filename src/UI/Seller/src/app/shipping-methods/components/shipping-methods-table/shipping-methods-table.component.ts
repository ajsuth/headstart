import { Component, ChangeDetectorRef, NgZone } from '@angular/core'
import { ResourceCrudComponent } from '@app-seller/shared/components/resource-crud/resource-crud.component'
import { Router, ActivatedRoute } from '@angular/router'
import { ShippingMethodsService } from '@app-seller/shipping-methods/shipping-methods.service'
import { ShippingMethod } from '@ordercloud/headstart-sdk'

@Component({
  selector: 'app-shipping-methods-table',
  templateUrl: './shipping-methods-table.component.html',
  styleUrls: ['./shipping-methods-table.component.scss'],
})
export class ShippingMethodsTableComponent extends ResourceCrudComponent<ShippingMethod> {
  continuationToken: string
  constructor(
    shippingMethodsService: ShippingMethodsService,
    changeDetectorRef: ChangeDetectorRef,
    router: Router,
    activatedRoute: ActivatedRoute,
    ngZone: NgZone
  ) {
    super(changeDetectorRef, shippingMethodsService, router, activatedRoute, ngZone)
  }

  async handleScrollEnd() {
    if ((this.resourceList?.Meta as any)?.ContinuationToken) {
      const continuationToken = [
        {
          ContinuationToken: `${(this.resourceList?.Meta as any)?.ContinuationToken
            }`,
        },
      ]
      const nextShippingMethodsRecords = await this.ocService.list(continuationToken)
      this.resourceList = {
        Meta: nextShippingMethodsRecords?.Meta,
        Items: [...this.resourceList.Items, ...nextShippingMethodsRecords.Items],
      }
    }
  }

  filterConfig = {
    Filters: [
      {
        Display: 'Type',
        Path: 'Type',
        Items: [
          { Text: 'Cancellation', Value: 'Cancellation' },
          { Text: 'Return', Value: 'Return' },
        ],
        Type: 'Dropdown',
      },
      {
        Display: 'Status',
        Path: 'Status',
        Items: [
          { Text: 'Requested', Value: 'Requested' },
          { Text: 'Processing', Value: 'Processing' },
          { Text: 'Approved', Value: 'Approved' },
          { Text: 'Complete', Value: 'Complete' },
          { Text: 'Denied', Value: 'Denied' },
        ],
        Type: 'Dropdown',
      },
      {
        Display: 'ADMIN.FILTERS.FROM_DATE',
        Path: 'from',
        Type: 'DateFilter',
      },
      {
        Display: 'ADMIN.FILTERS.TO_DATE',
        Path: 'to',
        Type: 'DateFilter',
      },
    ],
  }

  updateResourceInList(shippingMethod: ShippingMethod): void {
    const index = this.resourceList?.Items?.findIndex(
      (item) => item.id === shippingMethod.id
    )
    if (index !== -1) {
      this.resourceList.Items[index] = shippingMethod
    }
  }
}
