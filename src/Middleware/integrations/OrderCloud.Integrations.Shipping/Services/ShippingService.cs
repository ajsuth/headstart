using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Headstart.Common.Models;
using Microsoft.Azure.Cosmos;
using OrderCloud.Integrations.CosmosDB;
using OrderCloud.Integrations.Shipping.Models;
using OrderCloud.Integrations.Shipping.Repositories;
using OrderCloud.SDK;

namespace OrderCloud.Integrations.Shipping.Services
{
    public interface ICustomShippingService
    {
        List<IGrouping<AddressPair, HSLineItem>> CreateShipmentsFromWorksheet(HSOrderWorksheet worksheet, CheckoutIntegrationConfiguration config);

        Task<List<ShippingMethod>> GetApplicableShippingMethods(string currencyCode, CheckoutIntegrationConfiguration config);

        HSShipEstimate CreateShipEstimateForShipment(HSOrderWorksheet worksheet, List<HSLineItem> lineItems, List<ShippingMethod> shippingMethods, int index);
    }

    public class ShippingService : ICustomShippingService
    {
        private readonly IShippingMethodsRepository repository;

        public ShippingService(IShippingMethodsRepository repository)
        {
            this.repository = repository;
        }

        /// <summary>
        /// Creates shipments based on the shipment/delivery/fulfillment types applied to the storefront.
        /// </summary>
        /// <param name="worksheet">See the <see cref="HSOrderWorksheet"/>.</param>
        /// <param name="configData">The ConfigData of the checkout integration event.</param>
        /// <returns></returns>
        public List<IGrouping<AddressPair, HSLineItem>> CreateShipmentsFromWorksheet(HSOrderWorksheet worksheet, CheckoutIntegrationConfiguration configData)
        {
            // Group supplier products into supplier shipments
            var shipments = worksheet.LineItems.GroupBy(li => new AddressPair { ShipFrom = li.ShipFromAddress, ShipTo = li.ShippingAddress }).ToList();

            // Separate digital items from physical products into individual shipments
            // TODO: Currently not supported in the buyer app

            // Group shipment types, e.g. click and collect vs delivery
            // TODO: Currently not supported in the buyer app

            return shipments;
        }

        public async Task<List<ShippingMethod>> GetApplicableShippingMethods(string currencyCode, CheckoutIntegrationConfiguration configData)
        {
            var queryable = repository.GetQueryable()
                .Where(shippingMethod =>
                    shippingMethod.PartitionKey == "PartitionValue"
                    && shippingMethod.Active
                    && shippingMethod.Currency == currencyCode
                    && configData.Storefronts.Contains(shippingMethod.Storefront));

            var listOptions = new CosmosListOptions() { PageSize = 100, ContinuationToken = null };
            var shippingMethods = await GetShippingMethodsList(queryable, listOptions);

            return shippingMethods.Items;
        }

        public HSShipEstimate CreateShipEstimateForShipment(HSOrderWorksheet worksheet, List<HSLineItem> lineItems, List<ShippingMethod> shippingMethods, int index)
        {
            var shipMethods = new List<HSShipMethod>();

            // If all line items in the list have FreeShipping, then Mock rates
            if (lineItems.All(li => li.Product?.xp?.FreeShipping == true))
            {
                shipMethods.Add(CreateFreeShippingMethod(lineItems));
            }

            foreach (var shippingMethod in shippingMethods)
            {
                var shippingCost = GetApplicableShippingCost(worksheet, shippingMethod, lineItems);
                if (shippingCost != null)
                {
                    shipMethods.Add(new HSShipMethod
                    {
                        ID = shippingMethod.id,
                        Name = shippingMethod.Name,
                        Cost = (decimal)shippingCost,
                        EstimatedTransitDays = shippingMethod.EstimatedTransitDays ?? 0,
                        xp = new ShipMethodXP
                        {
                            FreeShippingApplied = false,
                            Description = shippingMethod.Description
                        }
                    });
                };
            }

            var firstLi = lineItems.First();
            var shipEstimate = new HSShipEstimate
            {
                ID = $"ShipEstimate{index}",
                ShipMethods = shipMethods,
                ShipEstimateItems = lineItems.Select(li => new ShipEstimateItem() { LineItemID = li.ID, Quantity = li.Quantity }).ToList(),
                xp = new ShipEstimateXP
                {
                    SupplierID = firstLi.SupplierID, // This will help with forwarding the supplier order
                    ShipFromAddressID = firstLi.ShipFromAddressID, // This will help with forwarding the supplier order
                },
            };

            return shipEstimate;
        }

        protected async Task<CosmosListPage<ShippingMethod>> GetShippingMethodsList(IQueryable<ShippingMethod> queryable, CosmosListOptions listOptions)
        {
            var requestOptions = new QueryRequestOptions();
            requestOptions.MaxItemCount = listOptions.PageSize;

            var shippingMethods = await repository.GetItemsAsync(queryable, requestOptions, listOptions);
            return shippingMethods;
        }

        protected HSShipMethod CreateFreeShippingMethod(List<HSLineItem> lineItems)
        {
            // TODO: Make configurable in Seller app
            return new HSShipMethod
            {
                ID = $"FREE_SHIPPING_{lineItems.First().SupplierID}",
                Cost = 0,
                Name = "FREE",
                EstimatedTransitDays = 1,
                xp = new ShipMethodXP
                {
                    FreeShippingApplied = true,
                },
            };
        }

        protected decimal? GetApplicableShippingCost(HSOrderWorksheet worksheet, ShippingMethod shippingMethod, List<HSLineItem> lineItems)
        {
            var total = 0m;
            foreach (var lineItem in lineItems)
            {
                total += lineItem.LineTotal;
            }

            var applicableShippingCost = shippingMethod.ShippingCosts.LastOrDefault(shippingCost => total > shippingCost.OrderTotal);

            return applicableShippingCost?.Amount;
        }
    }
}
