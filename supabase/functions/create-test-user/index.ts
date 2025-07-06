import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create or update the test user with email already confirmed
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'bakfietss@hotmail.com',
      password: 'system123!@#',
      email_confirm: true, // This bypasses email confirmation
      user_metadata: {
        name: 'Test User'
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      
      // If user already exists, try to update them
      if (error.message.includes('already registered')) {
        // Get user by email
        const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail('bakfietss@hotmail.com');
        
        if (!getUserError && existingUser.user) {
          // Update user to confirm email
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.user.id,
            { 
              email_confirm: true,
              password: 'system123!@#'
            }
          );
          
          if (updateError) {
            throw updateError;
          }
          
          return new Response(
            JSON.stringify({ 
              message: 'Test user updated and confirmed successfully',
              user: existingUser.user.email 
            }),
            { 
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200 
            }
          );
        }
      }
      
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        message: 'Test user created successfully',
        user: data.user?.email 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create test user' 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});