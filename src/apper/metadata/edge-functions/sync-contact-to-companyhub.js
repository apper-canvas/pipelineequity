// Edge Function to sync contact creation to CompanyHub
import apper from 'https://cdn.apper.io/actions/apper-actions.js';

apper.serve(async (req) => {
  // Validate HTTP method
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      message: 'Method not allowed. Only POST requests are accepted.'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse request body
    const body = await req.json();
    const { contactData, contactId } = body;

    // Validate required data
    if (!contactData) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Contact data is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Retrieve CompanyHub API key from secrets
    const apiKey = await apper.getSecret('COMPANYHUB_API_KEY');
    
    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        message: 'CompanyHub API key not configured'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prepare payload for CompanyHub API
    const companyHubPayload = {
      name: contactData.name_c || '',
      email: contactData.email_c || '',
      phone: contactData.phone_c || '',
      company: contactData.company_c || '',
      tags: contactData.tags_c || '',
      notes: contactData.notes_c || '',
      photo_url: contactData.photo_url_c || '',
      external_id: contactId?.toString() || '',
      source: 'Pipeline Pro CRM'
    };

    // Call CompanyHub API to create contact
    const companyHubResponse = await fetch('https://api.companyhub.com/v1/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(companyHubPayload)
    });

    // Check if CompanyHub API call was successful
    if (!companyHubResponse.ok) {
      const errorData = await companyHubResponse.text();
      return new Response(JSON.stringify({
        success: false,
        message: `CompanyHub API error: ${companyHubResponse.status} - ${errorData}`,
        statusCode: companyHubResponse.status
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse CompanyHub response
    const companyHubData = await companyHubResponse.json();

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Contact successfully synced to CompanyHub',
      data: {
        pipelineProId: contactId,
        companyHubId: companyHubData.id || companyHubData.contact_id,
        companyHubData: companyHubData
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // Handle any unexpected errors
    return new Response(JSON.stringify({
      success: false,
      message: `Error syncing contact to CompanyHub: ${error.message}`,
      error: error.toString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});