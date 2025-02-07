﻿using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Headstart.Common.Models
{
    [JsonConverter(typeof(StringEnumConverter))]
    public enum ClaimStatus
    {
        NoClaim,
        Pending,
        Complete,
    }
}
