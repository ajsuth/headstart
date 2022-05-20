using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Headstart.Common.Commands;
using Headstart.Common.Models;
using Microsoft.Azure.Cosmos;
using OrderCloud.Catalyst;
using OrderCloud.Integrations.CosmosDB;
using OrderCloud.Integrations.Shipping.Models;
using OrderCloud.Integrations.Shipping.Repositories;
using OrderCloud.SDK;

namespace OrderCloud.Integrations.Shipping.Commands
{
    public interface ICustomShippingCommand
    {
        Task<ShippingMethod> CreateShippingMethod(ShippingMethod shippingMethod);

        Task<CosmosListPage<ShippingMethod>> ListShippingMethods(CosmosListOptions listOptions);

        Task<ShippingMethod> Get(string id);

        Task<ShippingMethod> Get(ListArgs<ShippingMethod> args, DecodedToken decodedToken);

        Task<ShippingMethod> Save(string id, ShippingMethod shippingMethod, DecodedToken decodedToken);

        Task Delete(string id);
    }

    public class ShippingCommand : ICustomShippingCommand, IShippingCommand
    {
        private readonly IShippingMethodsRepository repository;

        public ShippingCommand(IShippingMethodsRepository repository)
        {
            this.repository = repository;
        }

        public async Task<HSShipEstimateResponse> GetRatesAsync(HSOrderWorksheet worksheet, CheckoutIntegrationConfiguration config = null)
        {
            try
            {
                var shipments = CreateShipmentsFromWorksheet(worksheet, config);
                var shippingMethods = await GetApplicableShippingMethods(worksheet.Order.xp.Currency?.ToString(), config);
                var shipEstimates = shipments.Select((shipment, index) =>
                {
                    return CreateShipEstimateForShipment(worksheet, shipment.ToList(), shippingMethods, index);
                });

                var shipEstimateResponse = new HSShipEstimateResponse
                {
                    ShipEstimates = shipEstimates.ToList(),
                };

                return shipEstimateResponse;
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }

        private HSShipEstimate CreateShipEstimateForShipment(HSOrderWorksheet worksheet, List<HSLineItem> lineItems, List<ShippingMethod> shippingMethods, int index)
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

        private decimal? GetApplicableShippingCost(HSOrderWorksheet worksheet, ShippingMethod shippingMethod, List<HSLineItem> lineItems)
        {
            var total = 0m;
            foreach (var lineItem in lineItems)
            {
                total += lineItem.LineTotal;
            }

            var applicableShippingCost =
                shippingMethod.ShippingCosts.Count > 0
                    ? shippingMethod.ShippingCosts.LastOrDefault(shippingCost => total > shippingCost.OrderTotal)
                    : null;

            return applicableShippingCost?.Amount;
        }

        public HSShipMethod CreateFreeShippingMethod(List<HSLineItem> lineItems)
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

        private List<IGrouping<AddressPair, HSLineItem>> CreateShipmentsFromWorksheet(HSOrderWorksheet worksheet, CheckoutIntegrationConfiguration config)
        {
            // Group supplier products into supplier shipments
            var shipments = worksheet.LineItems.GroupBy(li => new AddressPair { ShipFrom = li.ShipFromAddress, ShipTo = li.ShippingAddress }).ToList();

            // Separate digital items from physical products into individual shipments
            // foreach (var shipments = shipments) {}

            // Group shipment types, e.g. click and collect vs delivery

            return shipments;
        }

        private async Task<List<ShippingMethod>> GetApplicableShippingMethods(string currencyCode, CheckoutIntegrationConfiguration config)
        {
            var queryable = repository.GetQueryable()
                .Where(shippingMethod =>
                    shippingMethod.PartitionKey == "PartitionValue"
                    && shippingMethod.Active
                    && shippingMethod.Currency == currencyCode);

            var listOptions = new CosmosListOptions() { PageSize = 100, ContinuationToken = null };
            var shippingMethods = await GetShippingMethodsList(queryable, listOptions);

            return shippingMethods.Items;

        }

        public async Task<ShippingMethod> CreateShippingMethod(ShippingMethod shippingMethod)
        {
            shippingMethod.PartitionKey = "PartitionValue";
            return await repository.AddItemAsync(shippingMethod);
        }

        public async Task<CosmosListPage<ShippingMethod>> ListShippingMethods(CosmosListOptions listOptions)
        {
            //var listOptions = new CosmosListOptions() { PageSize = 100, ContinuationToken = null };

            var queryable = repository.GetQueryable().Where(shippingMethod => shippingMethod.PartitionKey == "PartitionValue");

            var shippingMethods = await GetShippingMethodsList(queryable, listOptions);
            return shippingMethods;
        }

        private async Task<CosmosListPage<ShippingMethod>> GetShippingMethodsList(IQueryable<ShippingMethod> queryable, CosmosListOptions listOptions)
        {
            var requestOptions = new QueryRequestOptions();
            requestOptions.MaxItemCount = listOptions.PageSize;
             
            var shippingMethods = await repository.GetItemsAsync(queryable, requestOptions, listOptions);
            return shippingMethods;
        }

        public async Task<ShippingMethod> Get(string id)
        {
            var shippingMethod = await repository.GetItemAsync(id);
            return shippingMethod;
        }

        public async Task<ShippingMethod> Get(ListArgs<ShippingMethod> args, DecodedToken decodedToken)
        {
            CosmosListOptions listOptions = new CosmosListOptions()
            {
                PageSize = 100,
                Search = args.Search,
                SearchOn = "id",
            };

            IQueryable<ShippingMethod> queryable = repository.GetQueryable()
                .Where(shippingMethod =>
                 shippingMethod.PartitionKey == "PartitionValue");

            CosmosListPage<ShippingMethod> shippingMethods = await GenerateShippingMethodList(queryable, listOptions);
            return shippingMethods.Items[0];
        }

        public async Task<ShippingMethod> Save(string shippingMethodID, ShippingMethod shippingMethod, DecodedToken decodedToken)
        {
            return await repository.UpsertItemAsync(shippingMethodID, shippingMethod);
        }

        public async Task Delete(string shippingMethodID)
        {
            await repository.DeleteItemAsync(shippingMethodID);
        }

        private async Task<CosmosListPage<ShippingMethod>> GenerateShippingMethodList(IQueryable<ShippingMethod> queryable, CosmosListOptions listOptions)
        {
            QueryRequestOptions requestOptions = new QueryRequestOptions();
            requestOptions.MaxItemCount = listOptions.PageSize;

            CosmosListPage<ShippingMethod> rmas = await repository.GetItemsAsync(queryable, requestOptions, listOptions);
            return rmas;
        }
    }
}
