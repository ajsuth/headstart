using Microsoft.Azure.Cosmos;
using OrderCloud.Integrations.CosmosDB;
using OrderCloud.Integrations.Shipping.Models;

namespace OrderCloud.Integrations.Shipping.Repositories
{
    public interface IShippingMethodsRepository : IRepository<ShippingMethod>
    {
    }

    public class ShippingMethodsRepository : CosmosDbRepository<ShippingMethod>, IShippingMethodsRepository
    {
        public ShippingMethodsRepository(ICosmosDbContainerFactory factory)
            : base(factory)
        {
        }

        public override string ContainerName { get; } = "shippingMethods";

        public override PartitionKey ResolvePartitionKey(string entityId) => new PartitionKey("PartitionValue");
    }
}
