export interface BurnBanData {
  county: string;
  issued: string;
  expires: string;
  exemptions: string[];
}

interface BurnBanDataRaw {
  ___id___: number;
  counties: string;
  exemptions: string;
  expires: string;
  issued: string;
}

export enum BurnBanExemption {
  "Mississippi Forestry Commission" = 1,
  "Certified Burn Managers" = 2,
  "County Fire Services" = 3,
  "Commercial contractors following MDEQ regulations" = 4,
  "Agricultural field burn" = 5,
  "Other" = 6,
}

type BurnBanDataResponse = { value: BurnBanDataRaw }[];

const certificate = Bun.file(`${__dirname}/../certs/gsrsaovsslca2018.pem`);

const requestInit: BunFetchRequestInit = {
  tls: {
    ca: certificate,
  },
};

async function fetchNonce(): Promise<string> {
  const nonceUrl = "https://www.mfc.ms.gov/burning-info/burn-bans/";
  const nonceMatch = /ninja_table_public_nonce=(?<nonce>[a-z0-9]+)/;

  const response = await fetch(nonceUrl, requestInit);
  const responseText = await response.text();

  if (!responseText) {
    throw new Error("Failed to fetch nonce");
  }

  const nonce = responseText.match(nonceMatch)?.groups?.nonce;

  if (!nonce) {
    throw new Error("Failed to parse nonce");
  }

  return nonce;
}

function tryParseDate(dateString: string): string {
  // All times are in CST
  const date = new Date(`${dateString} CST`);

  if (isNaN(date.getTime())) {
    return dateString;
  }

  return date.toISOString();
}

function getBurnBanRequest(nonce: string): Request {
  const url = new URL("https://www.mfc.ms.gov/wp-admin/admin-ajax.php");

  url.searchParams.set("action", "wp_ajax_ninja_tables_public_action");
  url.searchParams.set("table_id", "1775");
  url.searchParams.set("target_action", "get-all-data");
  url.searchParams.set("default_sorting", "new_first");
  url.searchParams.set("skip_rows", "0");
  url.searchParams.set("limit_rows", "0");
  url.searchParams.set("ninja_table_public_nonce", nonce);

  return new Request(url.href, {
    ...requestInit,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
}

function parseBurnBanData(rawData: BurnBanDataRaw): BurnBanData {
  return {
    county: rawData.counties.trim(),
    issued: tryParseDate(rawData.issued),
    expires: tryParseDate(rawData.expires),
    exemptions: rawData.exemptions
      .replace(/&/g, ",")
      .split(",")
      .map((exemption) => exemption.trim())
      .filter(Boolean)
      .map((exemption) => {
        const exemptionNumber = parseInt(exemption, 10);
        if (isNaN(exemptionNumber)) {
          return exemption;
        }

        if (exemptionNumber in BurnBanExemption) {
          return BurnBanExemption[exemptionNumber];
        }

        return exemption;
      }),
  };
}

export async function fetchBurnBanData(): Promise<BurnBanData[]> {
  const nonce = await fetchNonce();
  const request = getBurnBanRequest(nonce);
  const responseBody = await fetch(request);

  if (!responseBody.ok) {
    throw new Error("Failed to fetch burn ban data");
  }

  const ninjaTableData: BurnBanDataResponse = await responseBody.json();
  return ninjaTableData.map((row) => parseBurnBanData(row.value));
}
