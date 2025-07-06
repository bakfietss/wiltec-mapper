-- Disable email confirmation requirement for testing
-- This updates the auth configuration to allow unconfirmed email logins
UPDATE auth.config 
SET value = 'false' 
WHERE parameter = 'DISABLE_SIGNUP';

-- Alternative approach: manually confirm the existing user
UPDATE auth.users 
SET email_confirmed_at = now(), 
    confirmed_at = now() 
WHERE email = 'bakfietss@hotmail.com' 
AND email_confirmed_at IS NULL;