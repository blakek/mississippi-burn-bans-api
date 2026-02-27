export interface BurnBanData {
  counties: string;
  issued: string;
  expires: string;
  exemptions: string;
}

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

export async function fetchBurnBanData(): Promise<BurnBanData[]> {
  const nonce = await fetchNonce();

  const url = new URL("https://www.mfc.ms.gov/wp-admin/admin-ajax.php");

  url.searchParams.set("action", "wp_ajax_ninja_tables_public_action");
  url.searchParams.set("table_id", "1775");
  url.searchParams.set("target_action", "get-all-data");
  url.searchParams.set("default_sorting", "new_first");
  url.searchParams.set("skip_rows", "0");
  url.searchParams.set("limit_rows", "0");
  url.searchParams.set("ninja_table_public_nonce", nonce);

  const responseBody = await fetch(url, {
    ...requestInit,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!responseBody.ok) {
    throw new Error("Failed to fetch burn ban data");
  }

  const ninjaTableData: { value: BurnBanData }[] = await responseBody.json();

  const burnBanData = ninjaTableData.map(({ value: row }) => ({
    ...row,
    issued: tryParseDate(row.issued),
    expires: tryParseDate(row.expires),
  }));

  return burnBanData;
}
