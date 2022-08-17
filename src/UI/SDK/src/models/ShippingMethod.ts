import { ShippingCost } from './ShippingCost';
import { TaxCategorization } from './TaxCategorization';

export interface ShippingMethod {
    id: string
    Name?: string
    Description?: string
    Active?: boolean
    EstimatedTransitDays?: number
    Currency?: 'CAD' | 'HKD' | 'ISK' | 'PHP' | 'DKK' | 'HUF' | 'CZK' | 'GBP' | 'RON' | 'SEK' | 'IDR' | 'INR' | 'BRL' | 'RUB' | 'HRK' | 'JPY' | 'THB' | 'CHF' | 'EUR' | 'MYR' | 'BGN' | 'TRY' | 'CNY' | 'NOK' | 'NZD' | 'ZAR' | 'USD' | 'MXN' | 'SGD' | 'AUD' | 'ILS' | 'KRW' | 'PLN'
    Tax?: TaxCategorization
    Storefront?: string
    ShippingCosts?: ShippingCost[]
    IncludedProductIDs?: string[]
    ExcludedProductIDs?: string[]
}