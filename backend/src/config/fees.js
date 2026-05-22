/* Platform revenue knobs, shared by the payment + application services so
   the two ends of the ledger never disagree.

   - PLATFORM_FEE_RATE: the fee the client pays us on top of the service
     price at checkout (booked as CompanyPayment.FixedFee).
   - LISTING_FEE: a flat fee charged to the company on accept, but only once
     per calendar month per company (booked as CompanyPayment.ListingFee). */
export const PLATFORM_FEE_RATE = 0.05;
export const LISTING_FEE = 1600;
