using System.Collections.Generic;

namespace Headstart.Common.Models
{
    public class CheckoutIntegrationConfiguration
    {
        public bool ExcludePOProductsFromShipping { get; set; }

        public bool ExcludePOProductsFromTax { get; set; }

        public List<string> Storefronts { get; set; }
    }
}
