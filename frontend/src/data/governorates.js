/* Canonical Egypt governorate values — the single source of truth for every
   screen that reads or writes Company.Governorate (CompanyRegister,
   CompanyProfileEdit) or filters by it (RecommendationWizard).

   These exact strings are what the backend stores and matches on
   (company_service recommend does an exact `Governorate: governorate`
   query), so they MUST stay byte-identical across screens — never fork this
   list. Display labels are translated via the shared `common:governorates.<name>`
   map; the value submitted to the API is always the canonical string below. */
export const GOVERNORATES = [
  "Al Daqahliyah", "Red Sea", "Al Buhayrah", "Al Fayyum", "Al Gharbiyah",
  "Alexandria", "Ismailia", "Giza", "Al Minufiyah", "Al Minya", "Cairo",
  "Al Qalyubiyah", "Luxor", "New Valley", "Suez", "Ash Sharqiyah", "Aswan",
  "Asyut", "Bani Suwayf", "Port Said", "Damietta", "South Sinai",
  "Kafr ash Shaykh", "Matruh", "Qina", "North Sinai", "Suhaj",
];

export default GOVERNORATES;
