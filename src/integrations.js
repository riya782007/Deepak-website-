// Single switchboard for future integrations. Nothing here is active until
// a server endpoint is configured; secrets must never live in browser code.
import {company} from './content.js';

export const features = {
  crm: Boolean(company.enquiryEndpoint), // enquiries POST to your server, which forwards to the CRM
  payments: false,                       // server-created hosted checkout session (e.g. Razorpay / Stripe)
  assistant: false                       // AI assistant via a server-side streaming endpoint
};

// Returns {sent:true} when delivered to the server, otherwise {sent:false, file}
// with a local text brief the visitor can download (current template behaviour).
export async function submitEnquiry(data, summary) {
  if (features.crm) {
    const response = await fetch(company.enquiryEndpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(Object.fromEntries(data))
    });
    if (!response.ok) throw new Error('Enquiry could not be sent');
    return {sent: true};
  }
  return {sent: false, file: URL.createObjectURL(new Blob([summary], {type: 'text/plain'}))};
}
