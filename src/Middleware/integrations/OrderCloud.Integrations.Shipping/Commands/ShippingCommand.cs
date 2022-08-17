using System;
using System.Linq;
using System.Threading.Tasks;
using Headstart.Common.Commands;
using Headstart.Common.Models;
using Microsoft.Azure.Cosmos;
using OrderCloud.Catalyst;
using OrderCloud.Integrations.CosmosDB;
using OrderCloud.Integrations.Shipping.Models;
using OrderCloud.Integrations.Shipping.Repositories;
using OrderCloud.Integrations.Shipping.Services;

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
        private readonly ICustomShippingService shippingService;

        public ShippingCommand(IShippingMethodsRepository repository, ICustomShippingService shippingService)
        {
            this.repository = repository;
            this.shippingService = shippingService;
        }

        public async Task<HSShipEstimateResponse> GetRatesAsync(HSOrderWorksheet worksheet, CheckoutIntegrationConfiguration config = null)
        {
            var shipEstimateResponse = new HSShipEstimateResponse();

            try
            {
                // 1. Determine order shipments
                var shipments = shippingService.CreateShipmentsFromWorksheet(worksheet, config);
                // 2. Get order level applicable shipping methods
                var shippingMethods = await shippingService.GetApplicableShippingMethods(worksheet.Order.xp.Currency?.ToString(), config);
                // 3. Determine applicable shipping methods for each shipment
                var shipEstimates = shipments.Select((lineItems, index) =>
                {
                    return shippingService.CreateShipEstimateForShipment(worksheet, lineItems.ToList(), shippingMethods, index);
                });

                shipEstimateResponse.ShipEstimates = shipEstimates.ToList();
            }
            catch (Exception ex)
            {
                shipEstimateResponse.UnhandledErrorBody = ex.Message;
            }

            return shipEstimateResponse;
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
