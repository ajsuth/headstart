using System;
using Headstart.Common.Commands;
using Headstart.Common.Extensions;
using Headstart.Common.Settings;
using Microsoft.Extensions.DependencyInjection;
using OrderCloud.Integrations.Shipping.Commands;
using OrderCloud.Integrations.Shipping.Repositories;
using OrderCloud.Integrations.Shipping.Services;

namespace OrderCloud.Integrations.Shipping.Extensions
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddCustomShippingProvider(this IServiceCollection services, EnvironmentSettings environmentSettings)
        {
            if (!environmentSettings.ShippingProvider.Equals("Custom", StringComparison.OrdinalIgnoreCase))
            {
                return services;
            }

            services
                .AddSingleton<IShippingCommand, ShippingCommand>()
                .AddSingleton<ICustomShippingCommand, ShippingCommand>()
                .AddSingleton<ICustomShippingService, ShippingService>()
                .Inject<IShippingMethodsRepository>();

            return services;
        }
    }
}
