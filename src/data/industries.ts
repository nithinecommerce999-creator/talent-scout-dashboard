import type { MultiSelectOption } from "@/components/ui/multi-select";

// ── Per-industry options for Step 3 MultiSelect ────────────────────────────
// linkedinId removed — group-level IDs are used for API calls instead
export const INDUSTRIES: MultiSelectOption[] = [
  { value: "Law Practice",                          label: "Law Practice",                          group: "Finance & Legal" },
  { value: "Legal Services",                        label: "Legal Services",                        group: "Finance & Legal" },
  { value: "Accounting",                            label: "Accounting",                            group: "Finance & Legal" },
  { value: "Banking",                               label: "Banking",                               group: "Finance & Legal" },
  { value: "Insurance",                             label: "Insurance",                             group: "Finance & Legal" },
  { value: "Real Estate",                           label: "Real Estate",                           group: "Finance & Legal" },
  { value: "Financial Services",                    label: "Financial Services",                    group: "Finance & Legal" },
  { value: "Capital Markets",                       label: "Capital Markets",                       group: "Finance & Legal" },
  { value: "Machinery",                             label: "Machinery",                             group: "Manufacturing & Engineering" },
  { value: "Mechanical or Industrial Engineering",  label: "Mechanical or Industrial Engineering",  group: "Manufacturing & Engineering" },
  { value: "Electrical and Electronic Manufacturing", label: "Electrical and Electronic Manufacturing", group: "Manufacturing & Engineering" },
  { value: "Mining and Metals",                     label: "Mining and Metals",                     group: "Manufacturing & Engineering" },
  { value: "Oil and Energy",                        label: "Oil and Energy",                        group: "Manufacturing & Engineering" },
  { value: "Chemicals",                             label: "Chemicals",                             group: "Manufacturing & Engineering" },
  { value: "Utilities",                             label: "Utilities",                             group: "Manufacturing & Engineering" },
  { value: "Plastics",                              label: "Plastics",                              group: "Manufacturing & Engineering" },
  { value: "Industrial Automation",                 label: "Industrial Automation",                 group: "Manufacturing & Engineering" },
  { value: "Automotive",                            label: "Automotive",                            group: "Manufacturing & Engineering" },
  { value: "Construction",                          label: "Construction",                          group: "Construction & Real Estate" },
  { value: "Civil Engineering",                     label: "Civil Engineering",                     group: "Construction & Real Estate" },
  { value: "Building Materials",                    label: "Building Materials",                    group: "Construction & Real Estate" },
  { value: "Architecture and Planning",             label: "Architecture and Planning",             group: "Construction & Real Estate" },
  { value: "Transportation/Trucking/Railroad",      label: "Transportation/Trucking/Railroad",      group: "Transportation & Logistics" },
  { value: "Warehousing",                           label: "Warehousing",                           group: "Transportation & Logistics" },
  { value: "Airlines/Aviation",                     label: "Airlines/Aviation",                     group: "Transportation & Logistics" },
  { value: "Aviation and Aerospace",                label: "Aviation and Aerospace",                group: "Transportation & Logistics" },
  { value: "Package/Freight Delivery",              label: "Package/Freight Delivery",              group: "Transportation & Logistics" },
  { value: "Retail",                                label: "Retail",                                group: "Retail & Consumer Goods" },
  { value: "Consumer Goods",                        label: "Consumer Goods",                        group: "Retail & Consumer Goods" },
  { value: "Apparel and Fashion",                   label: "Apparel and Fashion",                   group: "Retail & Consumer Goods" },
  { value: "Wholesale",                             label: "Wholesale",                             group: "Retail & Consumer Goods" },
  { value: "Cosmetics",                             label: "Cosmetics",                             group: "Retail & Consumer Goods" },
  { value: "Restaurants",                           label: "Restaurants",                           group: "Food, Hospitality & Entertainment" },
  { value: "Food and Beverages",                    label: "Food and Beverages",                    group: "Food, Hospitality & Entertainment" },
  { value: "Food Production",                       label: "Food Production",                       group: "Food, Hospitality & Entertainment" },
  { value: "Entertainment",                         label: "Entertainment",                         group: "Food, Hospitality & Entertainment" },
  { value: "Media Production",                      label: "Media Production",                      group: "Arts, Media & Design" },
  { value: "Design",                                label: "Design",                                group: "Arts, Media & Design" },
  { value: "Environmental Services",                label: "Environmental Services",                group: "Energy & Environment" },
  { value: "Renewables and Environment",            label: "Renewables and Environment",            group: "Energy & Environment" },
  { value: "Oil and Energy",                        label: "Oil and Energy",                        group: "Energy & Environment" },
  { value: "Telecommunications",                    label: "Telecommunications",                    group: "Science & Biotech" },
  { value: "Defense and Space",                     label: "Defense and Space",                     group: "Science & Biotech" },
  { value: "Semiconductors",                        label: "Semiconductors",                        group: "Science & Biotech" },
  { value: "Civic and Social Organization",         label: "Civic and Social Organization",         group: "Community & Social" },
  { value: "Consumer Services",                     label: "Consumer Services",                     group: "Community & Social" },
];

// ── Group-level IDs sent to harvestapi/linkedin-job-search ────────────────
// Rules:
//  - Max 3 IDs per group
//  - Only short confirmed v2 IDs (≤120) used — long IDs like 5612, 2360
//    will cause "Industry not found" errors from the actor
//  - Groups with no confirmed short IDs send [] (actor searches by job
//    title only — safer than sending wrong IDs)
export const INDUSTRY_GROUP_IDS: Record<string, string[]> = {
  "Finance & Legal":                   [],
  "Manufacturing & Engineering":       [],
  "Construction & Real Estate":        [],
  "Transportation & Logistics":        [],
  "Retail & Consumer Goods":           [],
  "Food, Hospitality & Entertainment": [],
  "Arts, Media & Design":              [],
  "Energy & Environment":              [],
  "Science & Biotech":                 [],
  "Community & Social":                [],
};

export const INDUSTRY_GROUP_SELECTIONS: Record<string, string[]> = {
  "Finance & Legal":                   ["Accounting", "Banking", "Financial Services"],
  "Manufacturing & Engineering":       ["Oil and Energy", "Utilities", "Industrial Automation"],
  "Construction & Real Estate":        ["Construction", "Civil Engineering", "Real Estate"],
  "Transportation & Logistics":        ["Transportation/Trucking/Railroad", "Warehousing", "Airlines/Aviation"],
  "Retail & Consumer Goods":           ["Retail", "Food and Beverages", "Entertainment"],
  "Food, Hospitality & Entertainment": ["Restaurants", "Food Production", "Entertainment"],
  "Arts, Media & Design":              ["Media Production", "Design"],
  "Energy & Environment":              ["Environmental Services", "Renewables and Environment", "Oil and Energy"],
  "Science & Biotech":                 ["Telecommunications", "Defense and Space", "Semiconductors"],
  "Community & Social":                ["Civic and Social Organization", "Consumer Services"],
};

export const DATE_POSTED_OPTIONS = [
  { value: "past-24h",    label: "Past 24 hours" },
  { value: "past-week",   label: "Past week" },
  { value: "past-month",  label: "Past month" },
];

export const SENIORITY_OPTIONS = [
  { value: "Internship",       label: "Internship" },
  { value: "Entry level",      label: "Entry level" },
  { value: "Associate",        label: "Associate" },
  { value: "Mid-Senior level", label: "Mid-Senior level" },
  { value: "Director",         label: "Director" },
  { value: "Executive",        label: "Executive" },
];

export const WORK_TYPE_OPTIONS = [
  { value: "On-site", label: "On-site" },
  { value: "Remote",  label: "Remote" },
  { value: "Hybrid",  label: "Hybrid" },
];

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "Full-time",  label: "Full-time" },
  { value: "Part-time",  label: "Part-time" },
  { value: "Contract",   label: "Contract" },
  { value: "Temporary",  label: "Temporary" },
  { value: "Internship", label: "Internship" },
];

export const RELEVANCE_OPTIONS = [
  { value: "Most relevant", label: "Most relevant" },
  { value: "Most recent",   label: "Most recent" },
];

export const COMPANY_SIZE_OPTIONS = [
  { value: "1-10",       label: "1–10 employees" },
  { value: "11-50",      label: "11–50 employees" },
  { value: "51-200",     label: "51–200 employees" },
  { value: "201-500",    label: "201–500 employees" },
  { value: "501-1000",   label: "501–1,000 employees" },
  { value: "1001-5000",  label: "1,001–5,000 employees" },
  { value: "5001-10000", label: "5,001–10,000 employees" },
  { value: "10001+",     label: "10,001+ employees" },
];