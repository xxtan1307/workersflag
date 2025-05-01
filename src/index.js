// **Cloudflare Worker for User Identity and Country Flags**

// **1. Configuration**
// ******************

// **Cloudflare Account ID and R2 Bucket Details:**
const CLOUDFLARE_ACCOUNT_ID = '95f74cec3586f8d1c9154bf0c83a761e'; // Replace with your actual Cloudflare Account ID
const R2_BUCKET_NAME = 'flags'; // The name of your R2 bucket
const SUBDOMAIN = 'tunnel.xxtanflask.info'; // Your Cloudflare Tunnel subdomain

// **2. Helper Functions**
// *******************

/**
 * Retrieves the full country name from the country code.
 * @param code - The two-letter country code (e.g., 'US', 'CA').
 * @returns The full country name (e.g., 'United States', 'Canada') or the code if not found.
 */
function getCountryName(code){
  const countryNames = {
    SG: 'Singapore',
	MY: 'Malaysia',
	US: 'United States',
    CA: 'Canada',
    GB: 'United Kingdom',
    FR: 'France',
    DE: 'Germany',
    JP: 'Japan',
    AU: 'Australia',
    CN: 'China',
    IN: 'India',
    BR: 'Brazil',
    RU: 'Russia',
    ZA: 'South Africa',
    MX: 'Mexico',
    ES: 'Spain',
    IT: 'Italy',
    KR: 'South Korea',
    ID: 'Indonesia',
    NG: 'Nigeria',
    EG: 'Egypt',
    SA: 'Saudi Arabia',
    // Add more as needed
  };
  return countryNames[code] || code; // Return code if name not found
}

/**
 * Generates HTML for displaying a country flag as a link.
 * @param countryCode - The two-letter country code.
 * @param subdomain - The subdomain where the Worker is hosted.
 * @returns HTML string containing the flag image and link.
 */
function countryFlagHTML(countryCode,subdomain){
  const countryName = getCountryName(countryCode);
  if (!countryCode) return '<span>Unknown Country</span>';
  return `<a href="https://${subdomain}/secure/${countryCode}" title="${countryName}">
            <img src="/flags/${countryCode.toLowerCase()}.svg" alt="${countryName} Flag" style="width:50px;height:auto;border:1px solid #ccc;margin:5px;">
          </a>`;
}

// **3. Worker Logic**
// *****************

export default {
  async fetch(request,env,ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Get user identity information from request headers (Cloudflare Access)
    const email = request.headers.get('cf-access-authenticated-user-email');
    const country = request.headers.get('cf-ipcountry');
    const timestamp = new Date().toISOString();

    if (path === '/secure') {
      // a. /secure path: Return user identity information as HTML
      const countryHTML = countryFlagHTML(country || '', SUBDOMAIN); // Pass subdomain
      const html = `<!DOCTYPE html>
        <html>
        <head>
          <title>Secure Area</title>
        </head>
        <body>
          <h1>Authenticated Access</h1>
          <p>Email: ${email || '<i>(Not authenticated)</i>'}</p>
          <p>Authenticated at: ${timestamp}</p>
          <p>Country: ${country ? countryHTML : '<i>Unknown</i>'}</p>
          <p>Welcome to the secure area.</p>
        </body>
        </html>`;

      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    } else if (path.startsWith('/secure/')) {
      // b. /secure/${COUNTRY} path: Display the country flag from R2
      const countryCode = path.split('/').pop()?.toUpperCase();

      if (!countryCode) {
        return new Response('Country code is required.', { status: 400 });
      }

      const key = `${countryCode.toLowerCase()}.svg`;
      const object = await env.FLAGS_BUCKET.get(key); // Use the bound R2 bucket

      if (object === null) {
        return new Response('Flag not found in R2 bucket', { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.etag);
      headers.set('Content-Type', 'image/svg+xml'); //Set the content type

      return new Response(object.body, {
        headers,
      });
    } else {
      // Default: Respond to other paths
      return new Response(
        "Welcome to my Cloudflare Worker! This worker is active on the /secure and /secure/:country paths.",
        {
          headers: { 'Content-Type': 'text/plain' },
        },
      );
    }
  },
};