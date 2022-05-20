using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using OrderCloud.Catalyst;
using OrderCloud.Integrations.CosmosDB;
using OrderCloud.Integrations.Shipping.Commands;
using OrderCloud.Integrations.Shipping.Models;
using OrderCloud.SDK;

namespace Headstart.Common.Controllers
{
    /// <summary>
    /// Shipping.
    /// </summary>
    [Route("shipping")]
    public class ShippingController : CatalystController
    {
        private readonly ICustomShippingCommand command;

        public ShippingController(ICustomShippingCommand command)
        {
            this.command = command;
        }

        [HttpPost, OrderCloudUserAuth(ApiRole.ShipmentAdmin)]
        public async Task<ShippingMethod> Post([FromBody] ShippingMethod shippingMethod) =>
            await command.CreateShippingMethod(shippingMethod);

        [HttpPost, Route("list"), OrderCloudUserAuth]
        public async Task<CosmosListPage<ShippingMethod>> ListShippingMethods([FromBody] CosmosListOptions listOptions) =>
            await command.ListShippingMethods(listOptions);

        [HttpGet, Route("{id}"), OrderCloudUserAuth]
        public async Task<ShippingMethod> Get(string id) =>
            await command.Get(id);

        [HttpGet, OrderCloudUserAuth]
        public async Task<ShippingMethod> Get(ListArgs<ShippingMethod> args) =>
            await command.Get(args, UserContext);

        [HttpPut, Route("{id}"), OrderCloudUserAuth]
        public async Task<ShippingMethod> CreateOrUpdate(string id, [FromBody] ShippingMethod shippingMethod) =>
            await command.Save(id, shippingMethod, UserContext);

        [HttpDelete, Route("{id}"), OrderCloudUserAuth]
        public async Task Delete(string id) =>
            await command.Delete(id);
    }
}
