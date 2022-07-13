import { Inject, Injectable } from '@angular/core'
import { Router, ActivatedRoute } from '@angular/router'
import { ResourceCrudService } from '@app-seller/shared/services/resource-crud/resource-crud.service'
import { CurrentUserService } from '@app-seller/shared/services/current-user/current-user.service'
import {
  CosmosListOptions,
  HeadStartSDK,
  ShippingMethod,
} from '@ordercloud/headstart-sdk'
import { CosmosListPage } from '@ordercloud/headstart-sdk/dist/models/CosmosListPage'
import { AppConfig, Options } from '@app-seller/shared'
import { applicationConfiguration } from '@app-seller/config/app.config'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { OcTokenService } from '@ordercloud/angular-sdk'

export const SHIPPING_METHODS_SUB_RESOURCE_LIST = []

@Injectable({
  providedIn: 'root',
})
export class ShippingMethodsService extends ResourceCrudService<ShippingMethod> {
  constructor(
    router: Router,
    activatedRoute: ActivatedRoute,
    currentUserService: CurrentUserService,
    private http: HttpClient,
    private ocTokenService: OcTokenService,
    @Inject(applicationConfiguration) private appConfig: AppConfig
  ) {
    super(
      router,
      activatedRoute,
      HeadStartSDK.ShippingMethods,
      currentUserService,
      '/my-shipping-methods',
      'shipping-methods',
      SHIPPING_METHODS_SUB_RESOURCE_LIST,
      'shippingMethods',
      '/my-shipping-methods'
    )
  }

  emptyResource = {
    id: '',
    Name: '',
    Description: '',
    Active: false,
    EstimatedTransitDays: null,
    Tax: null,
    Currency: null,
    ShippingCosts: [],
    IncludedProductIDs: [],
  }

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.ocTokenService.GetAccess()}`,
    })
  }

  async shouldListResources(): Promise<boolean> {
    if (this.secondaryResourceLevel) {
      // for primary resources list if on the route
      return this.router.url.startsWith(this.route)
    } else {
      const parentResourceID = await this.getParentResourceID()
      // for secondary resources list there is a parent ID
      return (
        !!parentResourceID &&
        this.router.url.includes(this.secondaryResourceLevel)
      )
    }
  }

  public shouldDisplayList(): boolean {
    return true
  }

  async createNewResource(resource: any): Promise<any> {
    const newResource = await HeadStartSDK.ShippingMethods.Post(resource)
    this.resourceSubject.value.Items = [
      ...this.resourceSubject.value.Items,
      newResource,
    ]
    this.resourceSubject.next(this.resourceSubject.value)
    return newResource
  }

  async updateResource(originalID: string, resource: any): Promise<any> {
    const newResource = await HeadStartSDK.ShippingMethods.Put(
      originalID,
      resource
    )
    const resourceIndex = this.resourceSubject.value.Items.findIndex(
      (i: ShippingMethod) => i.id === newResource.id
    )
    this.resourceSubject.value.Items[resourceIndex] = newResource
    this.resourceSubject.next(this.resourceSubject.value)
    return newResource
  }

  async deleteResource(resourceID: string): Promise<null> {
    await HeadStartSDK.ShippingMethods.Delete(resourceID)
    this.resourceSubject.value.Items = this.resourceSubject.value.Items.filter(
      (i: ShippingMethod) => i.id !== resourceID
    )
    this.resourceSubject.next(this.resourceSubject.value)
    return
  }

  async createListArgs(options: any[], orderDirection = ''): Promise<any[]> {
    return [...options]
  }

  async constructNewRouteInformation(resourceID = ''): Promise<any[]> {
    let newUrl = `${this.route}`
    const queryParams = this.activatedRoute.snapshot.queryParams
    if (resourceID) {
      newUrl += `/${resourceID}`
    }
    return [newUrl, queryParams]
  }

  public async getMyResource(): Promise<any> {
    return { Name: undefined }
  }

  async getParentResourceID(): Promise<string> {
    const urlPieces = this.router.url.split('/')
    const indexOfParent = urlPieces.indexOf(`${this.primaryResourceLevel}`)
    return urlPieces[indexOfParent + 1]
  }

  public async list(args: any[]): Promise<CosmosListPage<ShippingMethod>> {
    let cosmosFilterOptions: CosmosListOptions = { Filters: null }
    if (args?.length && args[0].Filters != undefined) {
      cosmosFilterOptions = this.updateCosmosFilter(args)
    } else {
      cosmosFilterOptions = this.updateCosmosFilter([
        this.optionsSubject?.getValue().filters,
      ])
    }
    let tokenArg = null
    if (args?.length && !args[0].Filters?.length) {
      tokenArg = args?.find((arg) => arg?.ContinuationToken)
    }
    const cosmosListOptions: any = {
      PageSize: 100,
      ContinuationToken: tokenArg?.ContinuationToken,
      Filters: cosmosFilterOptions.Filters,
      Sort: 'Name',
      SortDirection: 'DESC',
      Search: args[0].search,
      SearchOn: 'id',
    }
    const url = `${this.appConfig.middlewareUrl}/shipping/list`
    const listResponse = await this.http
      .post<CosmosListPage<ShippingMethod>>(url, cosmosListOptions, {
        headers: this.buildHeaders(),
      })
      .toPromise()
    if (cosmosListOptions.ContinuationToken) {
      this.addResources(listResponse)
    }
    return listResponse
  }

  updateCosmosFilter(args: any[]): CosmosListOptions {
    const activeOptions = { ...this.optionsSubject.value, ...args }
    const queryParams = this.mapToUrlQueryParams(activeOptions)
    const cosmosFilterOptions = {
      Filters: this.buildCosmosFilterOptions(activeOptions),
    }
    return cosmosFilterOptions
  }

  buildCosmosFilterOptions(options: Options): any {
    const cosmosFilters = []
    if (options?.filters == null) {
      return
    }
    const filters = Object.entries(options?.filters)

    filters.forEach((filter) => {
      const cosmosFilterName = this.getCosmosFilterName(filter[0])
      const cosmosFilterTerm = this.getCosmosFilterTerm(filter)
      const cosmosOperator = this.getCosmosOperator(filter[0])
      const filterExpression = cosmosOperator + cosmosFilterTerm
      if (
        !cosmosFilters.some(
          (cosmosFilter) =>
            cosmosFilter?.PropertyName === cosmosFilterName &&
            cosmosFilter?.FilterExpression === filterExpression
        )
      ) {
        cosmosFilters.push({
          PropertyName: cosmosFilterName,
          FilterExpression: filterExpression,
        })
      }
    })
    return cosmosFilters
  }

  getCosmosFilterTerm(filter: [string, any]): string {
    if (filter[0] === 'to') {
      const date = new Date(filter[1]).toISOString()
      const formattedDate = date.split('T')
      const dateToUse = formattedDate[0] + 'T23:59:59.999Z' // End of day
      return dateToUse
    }
    return filter[1]
  }

  getCosmosFilterName(filterName: string): string {
    if (filterName === 'from' || filterName === 'to') {
      return 'DateCreated'
    }
    return filterName
  }

  getCosmosOperator(filterName: string): string {
    switch (filterName) {
      case 'from':
        return '>='
      case 'to':
        return '<='
      default:
        return '='
    }
  }

  public getResourceID(resource: ShippingMethod): string {
    return resource.id
  }

  public checkForResourceMatch(i: ShippingMethod, resourceID: string): boolean {
    return i.id === resourceID
  }

  public checkForNewResourceMatch(
    i: ShippingMethod,
    newResource: ShippingMethod
  ): boolean {
    return i.id === newResource.id
  }
}
