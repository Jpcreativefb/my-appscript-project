/* =====================================================
   PREDICTION MARKET STORED REFERENCE BRIDGE R5

   Vendor-neutral bridge used by R2 to validate the reference snapshot already
   accepted onto a market. It never performs network I/O and never changes
   trading math. External providers remain reference sources only.
===================================================== */

function predictionMarketStoredPriceProviderR5_() {
  return {
    getReferencePrices: function(market) {
      market = market || {};
      return {
        YES: market.referenceYesPrice,
        NO: market.referenceNoPrice,
        asOf: market.referencePriceAsOf,
        trusted: market.referencePriceTrusted === true
      };
    }
  };
}

function predictionMarketReferenceProvidersR5CreateR2PriceProviders() {
  return {
    MANUAL: predictionMarketStoredPriceProviderR5_(),
    KALSHI: predictionMarketStoredPriceProviderR5_(),
    POLYMARKET: predictionMarketStoredPriceProviderR5_(),
    DIRECTOR_APPROVED: predictionMarketStoredPriceProviderR5_()
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    predictionMarketStoredPriceProviderR5_: predictionMarketStoredPriceProviderR5_,
    predictionMarketReferenceProvidersR5CreateR2PriceProviders: predictionMarketReferenceProvidersR5CreateR2PriceProviders
  };
}
