import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EdiParseRequest {
  ediData: string;
}

interface EdiParseResponse {
  success: boolean;
  parsedData?: any;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ediData }: EdiParseRequest = await req.json();
    
    if (!ediData || typeof ediData !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid EDI data provided'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse EDI data to semantic JSON
    const parsedData = parseEdiToSemanticJson(ediData);

    const response: EdiParseResponse = {
      success: true,
      parsedData
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('EDI parsing error:', error);
    
    const errorResponse: EdiParseResponse = {
      success: false,
      error: error.message || 'Failed to parse EDI data'
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseEdiToSemanticJson(ediData: string): any {
  // Clean up the EDI data
  const cleanedData = ediData.trim();
  
  // Split into segments based on EDI segment terminators
  const segments = cleanedData.split(/[\r\n]+/).filter(line => line.trim());
  
  const result: any = {
    messageType: '',
    header: {},
    segments: {}
  };

  let currentLineItems: any[] = [];
  let currentLineItem: any = null;

  for (const segment of segments) {
    const elements = segment.split(/['+]/);
    const segmentType = elements[0];

    switch (segmentType) {
      case 'UNB':
        // Interchange header
        result.header = {
          sender: elements[2]?.split(':')[0] || '',
          recipient: elements[3]?.split(':')[0] || '',
          date: parseEdiDate(elements[4]) || new Date().toISOString()
        };
        break;

      case 'UNH':
        // Message header
        const messageRef = elements[2]?.split(':') || [];
        result.messageType = messageRef[0] || '';
        break;

      case 'BGM':
        // Beginning of message
        if (!result.segments.BGM) result.segments.BGM = [];
        result.segments.BGM.push({
          documentType: elements[1] || '',
          documentNumber: elements[2] || '',
          functionCode: elements[3] || ''
        });
        break;

      case 'DTM':
        // Date/time
        if (!result.segments.DTM) result.segments.DTM = [];
        const dateInfo = elements[1]?.split(':') || [];
        result.segments.DTM.push({
          qualifier: dateInfo[0] || '',
          date: parseEdiDate(dateInfo[1]) || '',
          format: dateInfo[2] || ''
        });
        break;

      case 'NAD':
        // Name and address
        if (!result.segments.NAD) result.segments.NAD = [];
        result.segments.NAD.push({
          qualifier: elements[1] || '',
          identification: elements[2] || '',
          name: elements[3] || '',
          address: elements[4] || ''
        });
        break;

      case 'LIN':
        // Line item
        if (currentLineItem) {
          currentLineItems.push(currentLineItem);
        }
        currentLineItem = {
          lineNumber: elements[1] || '',
          productId: elements[3] || '',
          additionalId: elements[4] || null
        };
        break;

      case 'PIA':
        // Additional product identification
        if (currentLineItem) {
          currentLineItem.PIA = {
            qualifier: elements[1] || '',
            value: elements[2]?.split(':')[0] || '',
            description: elements[2]?.split(':')[1] || ''
          };
        }
        break;

      case 'IMD':
        // Item description
        if (currentLineItem) {
          currentLineItem.IMD = elements[3] || '';
        }
        break;

      case 'QTY':
        // Quantity
        if (currentLineItem) {
          const qtyInfo = elements[1]?.split(':') || [];
          currentLineItem.QTY = {
            qualifier: qtyInfo[0] || '',
            quantity: qtyInfo[1] || '',
            unit: qtyInfo[2] || ''
          };
        }
        break;

      case 'UNT':
        // Message trailer - finalize line items
        if (currentLineItem) {
          currentLineItems.push(currentLineItem);
          currentLineItem = null;
        }
        break;

      default:
        // Handle other segments generically
        if (!result.segments[segmentType]) {
          result.segments[segmentType] = [];
        }
        result.segments[segmentType].push({
          raw: segment,
          elements: elements.slice(1)
        });
        break;
    }
  }

  // Add line items to result
  if (currentLineItems.length > 0) {
    result.segments.LIN = currentLineItems;
  }

  return result;
}

function parseEdiDate(dateStr: string): string {
  if (!dateStr) return '';
  
  // Handle YYMMDD format
  if (dateStr.length === 6) {
    const year = parseInt(dateStr.substring(0, 2));
    const month = dateStr.substring(2, 4);
    const day = dateStr.substring(4, 6);
    
    // Assume 20XX for years 00-30, 19XX for years 31-99
    const fullYear = year <= 30 ? 2000 + year : 1900 + year;
    
    return `${fullYear}-${month}-${day}`;
  }
  
  // Handle YYYYMMDD format
  if (dateStr.length === 8) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
}