using System.Collections.Generic;
using Headstart.Common.Services;
using OrderCloud.Integrations.CosmosDB;

namespace OrderCloud.Integrations.Shipping.Models
{
    public class ShippingMethod : CosmosObject
    {
        public string PartitionKey { get; set; }

        public string Name { get; set; }

        public string Description { get; set; }

        public bool Active { get; set; }

        public int? EstimatedTransitDays { get; set; }

        public string Currency { get; set; }

        public TaxCategorization Tax { get; set; }

        public IList<ShippingCost> ShippingCosts { get; set; }

        public string Storefront { get; set; }

        public IList<string> IncludedProductIDs { get; set; }
    }
}
