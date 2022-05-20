import { ShippingMethod } from '../models/ShippingMethod';
import { CosmosListPage } from '../models/CosmosListPage';
import { CosmosListOptions } from '../models/CosmosListOptions';
import { RequiredDeep } from '../models/RequiredDeep';
import httpClient from '../utils/HttpClient';
import { Filters } from '../models';

export default class ShippingMethods {
    private impersonating:boolean = false;

    /**
    * @ignore
    * not part of public api, don't include in generated docs
    */
    constructor() {
        this.Get = this.Get.bind(this);
        this.Post = this.Post.bind(this);
        this.List = this.List.bind(this);
        this.Put = this.Put.bind(this);
        this.Delete = this.Delete.bind(this);
    }

   /**
    * @param options.search Word or phrase to search for.
    * @param options.searchOn Comma-delimited list of fields to search on.
    * @param options.sortBy Comma-delimited list of fields to sort by.
    * @param options.page Page of results to return. Default: 1
    * @param options.pageSize Number of results to return per page. Default: 20, max: 100.
    * @param options.filters An object whose keys match the model, and the values are the values to filter by
    * @param accessToken Provide an alternative token to the one stored in the sdk instance (useful for impersonation).
    */
    public async Get( search: string, searchOn: string[], sortBy: string[], page: number, pageSize: number, filters: Filters<Required<ShippingMethod>>, accessToken?: string ): Promise<RequiredDeep<ShippingMethod>> {
        const impersonating = this.impersonating;
        this.impersonating = false;
        return await httpClient.get(`/shipping`, { params: { search, searchOn, sortBy, page, pageSize, filters, accessToken, impersonating } } );
    }

   /**
    * @param shippingMethod 
    * @param accessToken Provide an alternative token to the one stored in the sdk instance (useful for impersonation).
    */
    public async Post(shippingMethod: ShippingMethod, accessToken?: string ): Promise<RequiredDeep<ShippingMethod>> {
        const impersonating = this.impersonating;
        this.impersonating = false;
        return await httpClient.post(`/shipping`, shippingMethod, { params: { accessToken, impersonating } } );
    }

   /**
    * @param cosmosListOptions 
    * @param accessToken Provide an alternative token to the one stored in the sdk instance (useful for impersonation).
    */
    public async List(cosmosListOptions: CosmosListOptions, accessToken?: string): Promise<RequiredDeep<CosmosListPage<ShippingMethod>>> {
        const impersonating = this.impersonating;
        this.impersonating = false;
        return await httpClient.post(`/shipping/list`, cosmosListOptions, { params: { accessToken, impersonating } } );
    }

   /**
    * @param shippingMethodID ID of the shipping method.
    * @param shippingMethod 
    * @param accessToken Provide an alternative token to the one stored in the sdk instance (useful for impersonation).
    */
    public async Put(shippingMethodID: string, shippingMethod: ShippingMethod, accessToken?: string): Promise<RequiredDeep<ShippingMethod>> {
        const impersonating = this.impersonating;
        this.impersonating = false;
        return await httpClient.put(`/shipping/${shippingMethodID}`, shippingMethod, { params: { accessToken, impersonating } } );
    }

    /**
    * @param shippingMethodID id of the shipping method that you want to delete.
    * @param accessToken Provide an alternative token to the one stored in the sdk instance (useful for impersonation).
    */
     public async Delete(shippingMethodID: string, accessToken?: string): Promise<void> {
        const impersonating = this.impersonating;
        this.impersonating = false;
        return await httpClient.delete(`/shipping/${shippingMethodID}`, { params: { accessToken, impersonating } })
    }

    /**
     * @description 
     * enables impersonation by calling the subsequent method with the stored impersonation token
     * 
     * @example
     * RmAs.As().List() // lists RmAs using the impersonated users' token
     */
    public As(): this {
        this.impersonating = true;
        return this;
    }
}
