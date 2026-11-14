// Single switchboard for integrations. Nothing here sends data until it is configured.
// Secrets never live in browser code. The console API's public route only accepts a
// New website enquiry and rebuilds the record on the server (infra/api/app.mjs).
import {company} from './content.js';

const env = import.meta.env || {};
const CONSOLE_API = (env.VITE_CONSOLE_API_URL || '').replace(/\/$/, '');

export const features = {
  console: Boolean(CONSOLE_API),           // enquiries land on the admin console's Enquiries board
  crm: Boolean(company.enquiryEndpoint),        // enquiries POST to your server, which forwards to a CRM
  payments: false,                              // server-created hosted checkout session (e.g. Razorpay)
  assistant: false                              // AI assistant via a server-side streaming endpoint
};
features.online = features.console || features.crm;

// Website service → the console's "Enquiry for" category.
const KIND = {
  'it-services': 'Technology project', 'digital-learning': 'Technology project', 'it-education': 'Student course',
  'corporate-training': 'Corporate training', 'hr-consulting': 'HR consulting',
  'student-services': 'Student services', 'personal-development': 'Personal development'
};
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

export function enquiryDocument(data) {
  const service = data.get('service');
  const organisation = String(data.get('organisation') || '').trim();
  return {
    name: String(data.get('name') || '').trim(),
    phone: String(data.get('phone') || '').trim(),
    email: String(data.get('email') || '').trim(),
    kind: KIND[service] || 'Student course',
    programmeId: '',
    source: 'Website',
    stage: 'New',
    centre: '',
    followUp: today(),
    notes: [organisation && `Organisation: ${organisation}`, service && service !== 'general' && `Website service: ${service}`, String(data.get('message') || '').trim()].filter(Boolean).join('\n')
  };
}

// Returns {sent:true} when delivered, otherwise {sent:false, file} with a local text brief.
export async function submitEnquiry(data, summary) {
  if (features.console) {
    const response = await fetch(`${CONSOLE_API}/public/enquiry`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({...enquiryDocument(data), website: String(data.get('website') || '')})
    });
    if (!response.ok) throw new Error('Enquiry could not be sent');
  }
  if (features.crm) {
    const response = await fetch(company.enquiryEndpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(Object.fromEntries(data))
    });
    if (!response.ok) throw new Error('Enquiry could not be sent');
  }
  if (features.online) return {sent: true};
  return {sent: false, file: URL.createObjectURL(new Blob([summary], {type: 'text/plain'}))};
}
